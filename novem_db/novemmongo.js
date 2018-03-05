const packageLogger = require("../pkgLogger");
const log = packageLogger.subLogger('nmi');
log.load('Loaded novemmongo')
var single_instance = null;
var MongoClient = require("mongodb").MongoClient;
        
class NovemMongo
{
    constructor(opts)
    {
        log.load('Creating NovemMongo instance');
        if (!opts) { opts = {} }
        this.mongodb = null;
        single_instance = this;
        this.awaiting_ready = [];
        this.dbname = opts.dbname ?  opts.dbname : 'misc';
        this.opts = opts;
    }
    
    static get_instance (opts)
    {
        if (!single_instance) {
            single_instance = new NovemMongo(opts);
        }
        return new Promise( (resolve, reject) => {
            if (!opts) {opts = {};}
            log.log('init', 'nm26: single instance present');
            if (single_instance.mongodb) 
            {
                resolve (single_instance);
            }
            else
            {
                single_instance.initiate().then( (nmi) => {
                    resolve(nmi); // is this nec?
                });
            }
        
        });
    }
    
    static getMongoConnection()
    {
        if (!single_instance)
        {
            log.error("nm25: GETTING MONGO DB CONNECTION that is null");
            return null;
        }
        return single_instance.mongodb;
    }
    
    // INSTANCE MEMBERS
    
    close()
    {
        this.mongodb.close();
    }
    
    initiate(opts)
    {
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
                mongourl =  "mongodb://localhost:27017/photogami";
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
                resolve(this); //{status:"good", msg:"mongo connection made."})
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
            collection.save( opts.dict, function(err, r)
            {
                logger.op(`nm145: dict saved to ${opts.collection}`);
                if (opts.ready)
                {
                    opts.ready(err, r);
                }
            });
        });
    }
    
    findDict(opts)
    {
        
        var collection = this.mongodb.collection(opts.collection);
        
        collection.find(opts.query, opts.fields, opts.options, _fdcb);
        
        function _fdcb(err, cursor)
        {
            if (err)
            {
                console.log("find_dict error",err);
                if  (opts.ready) 
                {
                    opts.ready(null);
                }
            }
            else
            {
                var reta = cursor.toArray();
                if (opts.ready)
                {
                    opts.ready(reta);
                }
            }
        }
    }
    
}

module.exports = {
    NovemMongo
    };
