
import flat from "flat";
import dot from "dot-object";
import _ from 'lodash';
import defaultsDeep from 'lodash/defaultsDeep.js';
import packageLogger from './pkgLogger.js';
const log = packageLogger.subLogger('ndoc');

log.init("Loading NovemDoc...");

const DEBUG=true;

/**

Novem Document standards.

NovemDco wraps a nested hash (pute object) structure, ready to serialize
with no conversion of a core data structure.

this.dict

The primary purpose is to wrap a JSON serializable object allowing the dictionary to be
used as a representation of the class. It:
    1. allows setting and getting and pushing elements with dot notation
    2. allows transformation processing (flatenning, diffs, storage, query)
    3. decomposition, recomposition
    4. document type system

## Current Version

Chaned to ES6 module, mongo behavior removed to NDocRecipe system.

*/
export class NovemDoc
{
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
        //return new _DocumentClass({dict:obj});

        const retval = new this({dict:obj});
        if (this.modelDoctype) {
            retval.doctype = this.modelDoctype;
        }
        return retval;
    }

    static from_thing(obj)
    {   /* Create from dict or pass back NovemDoc.
            Is convienience gate for function that
            wants a NovemDoc but accept dicts.
        */
        if (obj instanceof NovemDoc) {
            return obj;
        }
        // else take this as a dict
        return this.from_dict(obj);

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

     //
    // GENERAL MEMBER FUNCTIONS
     //

     applyDeep(applicationDict) {
         // @@WHY: not doing this
         //     defaultsDeep(applicationDict, this.dict);
         //     this.dict = applicationDict;
         // We want to support object decomposition where existing
         // sub-objects might be held by other parts of the process
         // for separate work. Recomposition is not required in general
         // and is left for the application. Instead...

         // 1. we want to flatten, NovemDict does that, might
         //     want to have a static method for this.
         const appDoc =  NovemDoc.from_thing(applicationDict);

         // 2. flatten applicationDict
         const appFlat = appDoc.flatten();
         log.debug("nd182:", this.dict);

         // 3. apply the key/vals to current dict
         _.forEach(appFlat, (value, key) => {
             console.log("applying", key, value)
             this.set(key, value);
         });

         // 4. done
         log.debug("nd193:", this.dict);

     }

     get data() {
         return this.dict;
     }

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
        //console.log('nd190:', arg)
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
}

export default NovemDoc;
