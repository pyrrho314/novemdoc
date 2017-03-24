"use strict";

var dot = null;
var NovemMongo = null;

if (typeof(window) == "undefined")
{ // not windows, assume node
    dot = require("dot-object");
}
else
{
    // make sure dot-object.js is included
    console.log("Loading NovemDoc in browser...");
    dot = DotObject;
}

const DEBUG=false;

class NovemDoc
{/* This is a browers and node class for handling json data in the
    Novem Document standards.
    
    this.dict = in principle, JSON.serializable, otherwise at developer
    risk for members that serialize.
    */
    constructor (initarg)
    {
        /*
          { 
            doctype: string document type
            // only one should be set
            json: <json string>,
            dict: <json serializable object>,
            dot: <FUTURE table of dot notation list>
          }
        */
        if (!initarg) {
            initarg = {dict:{}};
        }
        if (true) console.log("nd37: mkdoc", initarg);
        
        // argument adaptation
        if (initarg._ndoc) 
            {   // this means the initarg IS a previous doc body
                this.dict = initarg;
            }
        else if (initarg.dict) 
            {   // this is a regular opts argument with basic 
                // json-serialiazable js obj
                this.dict = initarg.dict;
            }
        else if (initarg.json) 
            {   // this is a regular opts argument to pass in
                // actual JSON (string)
                this.dict = JSON.parse(initarg.json);
            }
        
        if (initarg.doctype)
        {
            //this.set("_ndoc.doctype", initarg.doctype);
            this.doctype = initarg.doctype;
        }
        
        if (this.doctype == undefined)
        {
            this.doctype == "untyped";
        }
        this.mongodb = null;
    }
     //
    // STATIC
    //
    static from_dict(obj)
    {
        return new NovemDoc({dict:obj});
    }
    
    
    // utility to get properties from objects without wrapping with a doc
    static getprop(key, dict)
    {
        return dot.pick(key, dict);
    }

    // utility to set properties from objects without wrapping with a doc
    static setprop(key, val, dict)
    {
        dot.set(key, val, dict);
    }
    
      //////
     //
    //  PROPERTIES
     //
      //////
    
    get doctype() {
        return this.get("_ndoc.doctype");
    }
    
    set doctype(val)
    {
        this.set("_ndoc.doctype", val);
    }
    
     //
    // Special member functions for internal use
     //
     
    get_mongo(opts){
        var self=this;
        if (!opts) { opts = {};}
        console.log("get_mongo");
        if (NovemMongo == null || this.novem_mongo == null)
        {
             NovemMongo = require("./novem_db/novemmongo");
        }
        
        
        if (this.novem_mongo == null)
        {
            //console.log("no novem_mongo instance");
            NovemMongo.get_instance({
                ready: function(nmi)
                {
                    self.novem_mongo = nmi;
                    if (opts.ready)
                    {
                        console.log("calling get_mongo cb");
                        opts.ready(nmi);
                    }
                }
            });
        }
        else
        {
            //console.log("no novem_mongo instance");
            if (opts.ready)
            {
                console.log("calling get_mongo cb");
                opts.ready(this.novem_mongo);
            }
        }
        return NovemMongo
     }
    
     //
    // GENERAL MEMBER FUNCTIONS
     //
     
    has_key(key)
    {
        var val =  dot.pick(key, this.dict)    ;
        return typeof(val) != "undefined"; 
    }
    
    json(pretty){
        var retv = null;
        if (pretty)
        {
            retv = JSON.stringify(this.dict, null, 4)
        }
        else
        {
            retv = JSON.stringify(this.dict);
        }
        return retv;
    }
    
    set(key, value)
    {
        if (DEBUG) console.log(`set: ${key}=${value}`);
        dot.set(key, value, this.dict);
    }
    
    get(key, def)
    {
        if (typeof(def) == "undefined")
        {
            def = null;
        }
        var rval = dot.pick(key, this.dict);
        if (DEBUG) console.log(`get: ${key}==${rval}`);
        if (!rval) { rval = def }
        return rval;
    }
    
    remove (key)
    {
        if (DEBUG) 
        {
            var oval = dot.pick(key, this.dict); // could remove with this
            console.log(`remove: ${key} was: ${oval}`);
        }
        dot.remove(key, this.dict);
    }
    
    set_dict(dict)
    {
        this.dict = dict;
    }
    
    mongo_save(opts)
    {   /* opts:
            ready: complete
        */
        var self = this;
        console.log("nd195: mongo_save",opts);
        this.get_mongo(
            {
                ready: function (nmi)
                {
                    console.log("u43: ready with doctype", self.doctype);
                    
                    nmi.save_dict(
                        {
                            collection: self.doctype,
                            dict: self.dict,
                            ready: function (err, r)
                                {
                                    //console.log("nd208: error:", err);
                                    opts.ready(nmi, err, r);
                                }
                        });
                    
                  
                }
            });

    }
    
    mongo_find( query )
    {
        
    }
    
}

if (typeof(window) == "undefined")
{ 
    module.exports = {
    NovemDoc : NovemDoc
    }
    // not windows, assume node
    // then NovemDoc will be globally declared,
}
else
{
}