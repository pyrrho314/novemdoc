"use strict";

let dot;
let log;
let _;
// NovemMongo is lazy loaded below
var NovemMongo = null;

const flat = require("flat");
if (typeof(window) == "undefined")
{ // not windows, assume node
    dot = require("dot-object");
    _ = require('lodash');
    const packageLogger = require('./pkgLogger');
    log = packageLogger.subLogger('doc');
    log.init("Loading NovemDoc in node backend...");

}
else
{
    // babel options, no babel version not avail for browser now
    // make sure dot-object.js is included
    dot = require("dot-object");
    _ = require('lodash');
    const packageLogger = require('./pkgLogger');
    log = packageLogger.subLogger('doc');
    log.init("Loading NovemDoc in node backend...");
    //NovemMongo = require('./novem_db/novemmongo');
    //@@PLAN: support logger in browser
    // log = something
    //throw new Error('no logger or lodash support in browser at moment!');
}

const DEBUG=true;

class NovemDoc
{/* This is a brower and node class for handling json data in the
    Novem Document standards. It wraps the structure to provide a minimalist framework
    for handling it and passing it around.

    this.dict = in principle, JSON.serializable.

    The primary purpose is to wrap a JSON serializable object allowing the dictionary to be
    used as a representation of the class. It:
        1. allows setting and getting and pushing elements with dot notation
        2. allows saving to DB (currently MongoDB)
        3. allows taking the dictionary and recreating as desired.

    Features from past examples:
        1. document decomposition/recomposition (todo)
        2. serialize to XML (???)
        3. export document as dot-property list
        4. support transformations through the dot-property key mapping (dot-object does this iirc)

    Features excluded:
        * not a general interface to Mongo. It doesn't hide mongo, it plays well with it.
            This should be the case with any future database adapter.
    */
    constructor (arg1, arg2)
    {
        /*  argument forms:
            (0) (): create empty document
            (1) (string, object): doctype first, and other settings separate
            (2) (object): doctype in settings.

            Settings:
              {
                doctype: string document type
                // only one should be set
                json: <json string>,
                dict: <json serializable object>,
                dotSchema: <FUTURE table of dot notation list>
              }
        */
        let initarg;
        let doctype;
        if (typeof(arg1) === "string")
        {
            doctype = arg1;
            initarg = arg2;
        }
        else
        {
            initarg = arg1;
        }

        if (!initarg) {
            initarg = {dict:{}};
        }

        if (doctype) {
            // if the user passes in doctype, that overwrites whatever
            // might already be in the dictionary options.
            initarg.doctype = doctype;
        }

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

    // @@Future: have getter/setter for dict to, e.g., enforce readonly or trigger
    // subscription event, which is in particular also not implemented yet.

    //
     //
    // Special member functions for internal use
     //

    static async _staticGetMongo(opts) {
        // @@D: lazy load on principle
        //  * browser doesn't call
        //  * imagining other database connections
        //  * efficient connection use
        //
        log.debug("_staticGetMongo", opts);
        if (NovemMongo == null)
        {
            if (typeof window === 'undefined') {
                // trick so webpack doesn't follow server only dependencies
                // but still can be required
               ({NovemMongo} = eval('require')("./novem_db/novemmongo"));
            } else {
                // windows only
            }
        }
        //@@TODO: handle error
        const nmi = await NovemMongo.get_connection(opts);
        log.debug("_staticGetMongo got nmi")
        return nmi;
    }

    async getMongo(opts) {
        // @@D: lazy load on principle
        //  * browser doesn't call
        //  * imagining other database connections
        //  * efficient connection use
        //
        if (NovemMongo == null)
        {
            // trick so webpack doesn't follow server only dependencies
            // but still can be required
            ({NovemMongo} = eval('require')("./novem_db/novemmongo"));
        }
        //@@TODO: handle error
        this.novem_mongo = await NovemDoc._staticGetMongo(opts);
        return this.novem_mongo;
     }

     static async _staticReleaseMongo(novem_mongo) {
        await novem_mongo.release_connection();
        return null;
     }
     async releaseMongo() {
        await NovemDoc._staticReleaseMongo(this.novem_mongo);
        this.novem_mongo = null;
     }

     //
    // GENERAL MEMBER FUNCTIONS
     //

    difference(object) {
        const base = this.dict;
    	function changes(object, base) {
    		return _.transform(object, function(result, value, key) {
    		    if (!_.isEqual(value, base[key])) {
    				result[key] = (_.isObject(value) && _.isObject(base[key])) ? changes(value, base[key]) : value;
    			}
    		});
    	}
    	return changes(object, base);
    }

    has_key(key)
    {
        var val =  dot.pick(key, this.dict);
        return typeof(val) != "undefined";
    }

    keys()
    {
        return Object.keys(this.dict);
    }

    flatten()
    {
        return flat(this.dict);
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

    toJSON(arg) {
        console.log('nd190:', arg)
        return this.json();
    }

    meta(key, value) {
        // get/set meta data
        const hasValue  = arguments.length >= 2;
        if (!hasValue) {
            return this.get(`_ndoc.${key}`);
        } else {
            this.set(`_ndoc.${key}`, value);
        }
    }

    set(key, value)
    {
        dot.set(key, value, this.dict);
    }

    get(key, def)
    {
        if (typeof(def) == "undefined")
        {
            def = null;
        }
        var rval = dot.pick(key, this.dict);
        if (!rval) { rval = def }
        return rval;
    }

    push(key, value) {
        let target = this.get(key);
        if (target === null) {
            target = [];
        }
        target.push(value);
    }

    pop(key, value) {
        let target = this.get(key);
        if (target === null) {
            return null;
        }
        return target.pop();
    }

    remove (key)
    {
        if (DEBUG)
        {
            var oval = dot.pick(key, this.dict); // could remove with this
            log.detail(`remove: ${key} was: ${oval}`);
        }
        dot.remove(key, this.dict);
    }

    toString(opts) {
        return this.json(true);
    }

    toSource(opts) {
        return this.json(true);
    }

    /////
    //
    // Documents Composition and Decomposition
    //
    getSubdoc(key, opts) {
        /* opts:
            addRecompose
        */
        if (!opts)  opts = {};
        opts = _.defaultsDeep(opts, {
            addRecompose: false,
            addDoctype: true,
        });
        const subdict = this.get(key);
        // check if object
        const isObject = subdict instanceof Object;
        const isArray  = subdict instanceof Array;

        if (!isObject || isArray) {
            // no document to return
            return null;
        }

        // wrap in novemdoc
        const rdoc = new NovemDoc({dict:subdict});

        // optionally add recomposition information
        if (opts.addRecompose) {
            rdoc.meta("subdoc.fromKey", key);
        }

        // return subdocument: note it's pointing directly into this document!
        return rdoc;

    }


    /////
    //
    // Mongo related calls, here for convienience... should migrate to data store plugin base
    //  on the Mongo novemmongo.js
    //
    async mongoSave(opts)
    {
        log.query("nd273: mongoSave opts %O", opts);
        log.detail("nd274saving %O", this.dict);
        const nmi = await this.getMongo();
        const answer = await nmi.saveDict(
                        {
                            collection: this.doctype,
                            dict: this.dict,
                        });
        this.releaseMongo();
        log.detail("save answer: %j", answer);
        const savedDoc = answer.savedDoc;
        // @@PLAN: this doesn't play well with serializeable members of the dict
        //  as they will be converted to thier serialization.
        //  Need to parse and turn these into object at least in the case of nested
        //  NovemDoc instances, which can be detected by the _ndoc annotation.
        this.dict = savedDoc;
        return answer;
    }

    static async mongoFindAll( arg )
    {
        /* arg:
            doctype     - document type for query (optional but can be used instead of collection)
            collection  - collection (required but will use doctype if present)
            query       - passed to mongo find
            fields      - passed to mongo find
            option      - passed to mongo find
            returnDicts - return dict instead of NovemDoc
        */
        const {doctype, query={}, fields, options, returnDicts = false} = arg
        const nmi = await NovemDoc._staticGetMongo();
        if (doctype) {
            _.set(query, '_ndoc.doctype', doctype);
        }
        const collection = arg.collection ? arg.collection : doctype;
        if (!collection) {
            throw new Error('nd309: Mongo Find, collection not defined')
        }
        let result = await nmi.findDicts({ collection, query, fields, options });

        NovemDoc._staticReleaseMongo(nmi);

        log.answer("mongoFindAll result length", result.length );
        if (!returnDicts) {
            result = result.map( (item) => {
                const rdoc = NovemDoc.from_dict(item)
                rdoc.set('_ndoc.mongo.collection', collection);
                if (!doctype)
                {
                    doctype = collection;
                    rdoc.doctype = doctype;
                }
                return rdoc;
            })
        }
        return result;

    }

    static async mongoFindOne(arg)
    {
        log.dump("mongoFindOne arg", arg, log.debug);
        let {doctype, collection, query={}, fields, options, returnDict=false} = arg
        const nmi = await  NovemDoc._staticGetMongo();
        log.debug("mongoFindOne has nmi")
        if (doctype) {
            _.set(query, '_ndoc.doctype', doctype);
        }
        collection = collection ? collection : doctype;
        let result =  await nmi.findOneDict({ collection, query, fields, options });

        NovemDoc._staticReleaseMongo(nmi);

        log.answer("find one result", result );
        if (!returnDict) {
            const rdoc = NovemDoc.from_dict(result)
            rdoc.set('_ndoc.mongo.collection', collection);
            if (!doctype)
            {
                doctype = collection;
                rdoc.doctype = doctype;
            }
            result = rdoc;
        }
        return result;
    }


}

if (typeof(window) === "undefined")
{
    exports.NovemDoc = NovemDoc;
    // not windows, assume node
}
else
{
    // then we require anyway for babel... sigh
    exports.NovemDoc  = NovemDoc;
}
