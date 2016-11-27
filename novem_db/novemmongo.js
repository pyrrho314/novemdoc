
var single_instance = null;
var MongoClient = require("mongodb").MongoClient;
        
class NovemMongo
{
    constructor(opts)
    {
        console.log("Creating NovemMongo Instance");
        this.mongodb = null;
        single_instance = this;
        this.awaiting_ready = [];
        if (typeof(opts) != "undefined")
        {
            this.initiate(opts);
        }
    }
    
    static get_instance (opts)
    {
        if (!opts) {opts = {};}
        if (!single_instance)
        {
            console.log(
`nm20: single instance null, waiting 1 sec 
       (shouldn't happen)
       (1) module should call initiate first
       (2) OR connection too slow?)`);
            setTimeout(NovemMongo.get_instance, 1000, opts);
            return;
        }
        else
        {
            console.log("nm26: single instance present");
            if (single_instance.mongodb) 
            {
                if (opts.ready) 
                    { 
                        console.log("nm26: calling caller's ready func");
                        opts.ready(single_instance);
                    }
            }
            else
            {
                if (opts.ready) 
                    { 
                        console.log("nm31: queing caller's ready func");
                        single_instance.awaiting_ready.push(opts.ready);
                    }
            }
        }
    }
    
    static get_mongo_connection()
    {
        
        if (!single_instance)
        {
            console.log("nm25: GETTING MONGO DB CONNECTION that is null");
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
        // used to create singletone
        // clients that don't want to configure the system
        // use static get_instance
        console.log("nm39:Initiating Mongo Connection and NovemMongo instance")
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
                console.log("nm53: Mongo Not Present", err);
                return;
            }
            else
            {
                console.log("nm59: Mongo Found");
            }
            self.mongodb = db;
            if (opts.ready) { opts.ready(self);}
            self.signal_ready();
            
            const INITIATEDB = false;
            
            if (INITIATEDB)
            {
                var users = self.mongodb.collection("users");
                
                if (INITIATEDB)
                {
                    users.update({id:1}, records[0], {upsert:true}, 
                        function(err, event , obj)
                        {
                            console.log("u47: test user upserted: error ", err);
                        });
                }
            }
            
        });
        
        return this; // chaining
    }
    
    signal_ready ()
    {
        for (var i in this.awaiting_ready)
        {
            var readyfunc = this.awaiting_ready[i];
            readyfunc(this);
        }
        this.awaiting_ready = [];
    }
    
    save_dict(opts)
    {   /* opts:
            dict: the data object, Mongo Serializable
            collection: string name of collection
            ready(err, r): callback function
        */
        if (!opts) { opts = {};}
        if (!opts.dict) { return false;}
        if (!opts.collection) { opts.collection = "unknown";}
        var collection = this.mongodb.collection(opts.collection);
        collection.save( opts.dict, function(err, r)
        {
            console.log(`nm145: dict saved to ${opts.collection}`);
            if (opts.ready)
            {
                opts.ready(err, r);
            }
        });
    }
    
    find_dict(opts)
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

module.exports = NovemMongo;
