const _ = require("lodash");
const packageLogger = require("../pkgLogger");
const log = packageLogger.subLogger('nmi');
const config = require('../config');

log.load('novemmongo module')

var single_instances = {};

var { MongoClient, ObjectID} = require("mongodb");

class NovemMongo
{
    constructor(opts)
    {
        this.refCount = 0;
        this.client = null;
        log.load('Creating NovemMongo instance');
        log.dump('options', opts);
        if (!opts) { opts = {} }
        this.mongodb = null;
        this.awaiting_ready = [];
        this.dbname = opts.dbname ?  opts.dbname : 'misc';
        this.opts = Object.assign({}, opts);
    }

    static get_connection(opts)
    {
        //
        if (opts && opts.dbname && !opts.ignoreOpts) {
                log.error("Error, opts:", opts);
                throw new Error("Can't use opts if you are not first connection.");
            }
        if (!opts) { opts = {} }
        /*
            dbname
            name: name of connection
            ignoreOpts: ignores opts if exists (supports lazy loading)
        */
        log.detail('get_connection %j', opts);
        log.dump("config right now:", config.dict)
        const dbName = opts.dbname ? opts.dbname : config.get('dbname', 'ndoc_db');
        log.detail('dbName', dbName);
        opts.dbname = dbName;
        opts.host = opts.host ? opts.host             : config.get("host");
        opts.username = opts.username ? opts.username     : config.get("username");
        opts.password = opts.password ? opts.password : config.get("password");        // feat: named instance so more than one connection is supported through this interface
        const instanceName = opts.name ? opts.name    : "default";
        const ignoreOpts = opts.ignoreOpts ? opts.ignoreOpts : false;

        // set opts that might have defaults (or not)
        opts.name = instanceName;
        // DOC: This module shares an instance, but you can send in `opts.name`
        // property and get a named instance to control sharing.  This isn't really
        // tested atm.
        let single_instance = single_instances[instanceName];
        if (!single_instance) {
            single_instance = new NovemMongo(opts);
            single_instances[instanceName] = single_instance;
        }

        single_instance.incRefCount();

        return new Promise( (resolve, reject) => {
            if (!opts) {opts = {};}
            log.log('init', 'nm26: single instance present');
            if (single_instance.mongodb)
            {
                log.op('return novem mongo instance');
                resolve(single_instance);
            }
            else
            {
                /// MAKE CONNECTION
                log.query('connect to mongo');
                resolve(single_instance.initiate());
            }
        });
    }

    static async close_connections() {
        // close all connections
        for (let instanceName in single_instances) {
            single_instances[instanceName].close();
            delete single_instances[instanceName];
        }
    }

    async release_connection() {
        this.decRefCount();
        // works with static members
        // hardcode now to share all and close only at end, but this
        //  can get smarter.
        const CLOSE_WHEN_UNUSED = true;
        if (CLOSE_WHEN_UNUSED && this.refCount <= 0) {
            this.close()
            const instanceName = this.opts.name;
            delete single_instances[instanceName];
        }
    }



    // can be used by callers to track shared use
    incRefCount() {
        this.refCount += 1;
    }

    decRefCount() {
        this.refCount -= 1;
    }

    // INSTANCE MEMBERS

    close()
    {
        this.client.close();
    }

    // MAKE THE CONNECTION
    initiate(opts)
    {
        if (!opts) opts = {};
        log.dump("initiate() opts", opts, log.debug);
        const dbname = this.dbname;
        return new Promise( (resolve, reject ) => {
            // used to create singletone
            // clients that don't want to configure the system
            // use static get_instance
            log.init("nm67:Initiating Mongo Connection and NovemMongo instance");
            var mongourl = opts.mongo_url;

            if (!mongourl)
            {
                log.dump("build url from this.opts", this.opts);
                let userpart;
                if (this.opts.username) {
                    userpart = `${this.opts.username}:${this.opts.password}@`;
                }
                else {
                    userpart = '';
                }

                mongourl =  `mongodb://${userpart}${this.opts.host}/admin`;
                log.debug("mongourl", mongourl);
            }

            var mongodb = null;
            const self = this;
            MongoClient.connect(mongourl,
                {
                    useUnifiedTopology: true,
                    //useNewUrlParser: true,

                },
                function(err, client)
                    {
                        if (err)
                        {
                            log.error("nm53: Mongo Not Present", err);
                            reject(err);
                            return;
                        }
                        else
                        {
                            log.answer("nm59: Mongo Found");
                        }
                        self.client = client;
                        console.log("nm169:", self.opts);
                        self.mongodb = client.db(self.opts.dbname);
                        if (opts.ready) { self.opts.ready(self);}
                        self.signalReady();
                        resolve(self); //{status:"good", msg:"mongo connection made."})
                    });
        });
    }

    signalReady ()
    {
        for (var i in this.awaiting_ready)
        {
            var readyfunc = this.awaiting_ready[i];
            readyfunc(this);
        }
        this.awaiting_ready = [];
    }

    saveDict(opts)
    {   /*
            opts:
                dict: the data object, Mongo Serializable
                collection: string name of collection

            returns Promise
        */
        return new Promise( (resolve, reject) => {
            if (!opts) { opts = {};}
            if (!opts.dict) { return false;}
            if (!opts.collection) { opts.collection = "unknown";}
            log.dump("saveDict options", opts, log.info);
            log.info("saving opts.dict", JSON.stringify(opts.dict, null, 2));
            var collection = this.mongodb.collection(opts.collection);
            const theDict = _.cloneDeep(opts.dict);
            if (!theDict._id) {
                return collection.insertOne(theDict,
                    function(err, r)
                        {
                            log.op(`nm127: first saved to ${opts.collection}`, JSON.stringify(theDict, null, 4));
                            if (err)
                            {
                                reject(err);
                            } else
                            {
                                //const savedDict = r.ops[0];
                                resolve({
                                    status: "saved",
                                    savedDoc: r.ops[0],
                                });
                            }
                        });
            }
            else {
                return collection.replaceOne( {_id: theDict._id}, theDict,
                    {upsert: true},
                    function(err, r)
                        {
                            log.op(`nm127: dict saved to ${opts.collection}`, JSON.stringify(theDict, null, 4));
                            if (err)
                            {
                                reject(err);
                            } else
                            {
                                //const savedDict = r.ops[0];
                                resolve({
                                    status: "saved",
                                    savedDoc: r.ops[0],
                                });
                            }
                        });
            }
        });
    }

    async findDicts(opts)
    {
        /* opts:
            query
            options
            collection

            Gets all docs at once... to do add returnCursor to options OR make another function
        */
        const collection = this.mongodb.collection(opts.collection);

        const resultCursor = await collection.find(opts.query, opts.fields, opts.options);
        const result = await resultCursor.toArray();
        // log.debug("findDict result", result);
        return result;
    }

    async findDict(opts) {
        log.warn('DEPRECATED: findDict, use findDicts');
        return findDicts(opts);
    }

    // note we are refactoring such that using Novemdoc on front end will require babel
    async findOneDict(opts){
        /* opts:
            query - mongo findOne query
            options - mongo findOne options
        */
        const collection = this.mongodb.collection(opts.collection);
        log.debug("findOneDict got collection",opts.query, opts.optimize);
        const answer = await collection.findOne(opts.query, opts.options);
        log.answer('findeOneDict answer', answer);
        return answer;
    }

    async deleteDicts(opts) {
        {
            /* opts:
                query
                options
                collection

                Gets all docs at once... to do add returnCursor to options OR make another function
            */
            const collection = this.mongodb.collection(opts.collection);
            log.debug(`deleteDicts query:\n${JSON.stringify(opts.query, null, 4)}`);
            let result = await collection.deleteMany(opts.query, opts.options);
            if (result.result) result = result.result;// log.debug("findDict result", result);
            return result;
        }

    }
}

module.exports = {
    NovemMongo
    };
