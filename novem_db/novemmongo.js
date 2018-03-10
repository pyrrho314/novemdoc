const _ = require("lodash");
const packageLogger = require("../pkgLogger");
const log = packageLogger.subLogger('nmi');
log.load('novemmongo module')

var single_instances = {};
    
var { MongoClient, ObjectID} = require("mongodb");
        
class NovemMongo
{
    constructor(opts)
    {
        this.refCount = 0;
        log.load('Creating NovemMongo instance');
        if (!opts) { opts = {} }
        this.mongodb = null;
        this.awaiting_ready = [];
        this.dbname = opts.dbname ?  opts.dbname : 'misc';
        this.opts = opts;
    }
    
    static get_connection(opts)
    {
        /*
            dbname
            name: name of connection
            ignoreOpts: ignores opts if exists (supports lazy loading)
        */
        const dbName = opts.dbname ? opts.dbname : "misc";
        const instanceName = opts.name ? opts.name : "default";
        //
        const ignoreOpts = opts.ignoreOpts ? opts.ignoreOpts : false;
        // set opts that might have defaults (or not)
        opts.name = instanceName;
        let single_instance = single_instances[instanceName]; 
        if (!single_instance) {
            single_instance = new NovemMongo(opts);
            single_instances[instanceName] = single_instance;
        }
        else
        {
            // @@TODO: warn/err if these opts are different...
            if (opts && !ignoreOpts) {
                throw new Error("Can't use opts if you are not first connection.");
            }
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
        const CLOSE_WHEN_UNUSED = false;
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
        this.mongodb.close();
    }
    
    initiate(opts)
    {
        //@@PLAN: use novemDoc for config system, load hardcodes from there.
        if (!opts) opts = {};
        const dbname = this.dbname;
        return new Promise( (resolve, reject ) => {
            // used to create singletone
            // clients that don't want to configure the system
            // use static get_instance
            log.init("nm67:Initiating Mongo Connection and NovemMongo instance");
            var mongourl = opts.mongo_url;
            
            if (!mongourl) 
            {
                mongourl =  `mongodb://localhost:27017/${this.dbname}`;
            }
        
            var mongodb = null;
            const self = this;
            MongoClient.connect(mongourl, function(err, db)
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
                self.mongodb = db;
                if (opts.ready) { opts.ready(self);}
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
            var collection = this.mongodb.collection(opts.collection);
            const theDict = _.cloneDeep(opts.dict)
            collection.save( theDict, function(err, r)
            {
                log.op(`nm127: dict saved to ${opts.collection}`);
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
        });
    }
    
    findDict(opts)
    {
        return new Promise((resolve, reject) => {
            const collection = this.mongodb.collection(opts.collection);
            
            collection.find(opts.query, opts.fields, opts.options, _fdcb);
            
            function _fdcb(err, cursor)
            {
                if (err)
                {
                    log.error("find_dict error: %s", err.msg);
                    reject({ status: "error", err });
                }
                else
                {
                    var reta = cursor.toArray();
                    resolve(reta)
                }
            }
        });
    }
    
    
    findOneDict(opts){
        return new Promise( (resolve, reject) => {
           const collection = this.mongodb.collection(opts.collection);
           collection.findOne(opts.query, opts.fields, opts.options, _fodcb);
           function _fodcb(err, result)
           {
               if (err)
               {
                   log.error('findOneDict error: %s', err.msg);
                   reject({status:"error", err});
               }
               else
               {
                   resolve(result);
               }
           }
        });
    }
}

module.exports = {
    NovemMongo
    };
