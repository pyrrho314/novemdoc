import mongodb from 'mongodb';
import NovemDoc from '../../novemdoc.js';
import NDocStep from '../NDocStep.js';
import {prettyJson} from '../../misc/pretty.js';
import config from '../../config.js'

import pkgLogger from '../../pkgLogger.js';
const ObjectID = mongodb.ObjectID;

const log = pkgLogger.subLogger('mS');

const { MongoClient } = mongodb;
/*
    ACTION SYSTEM

    The idea with this system is each of these object can do
    an operation on a document.

    The `mongoActionKit` has operations that are lists of these
    MongoAction objects. They are executed in order, given a
    chance at the document. They should then return an output
    object.
*/

/* NOTE:
Uses the following environment variables:
    * MONGO_USERNAME
    * MONGO_PASSWORD
    * MONGO_HOST
    * MONGO_PORT
*/

const DEBUG = true;

let _mongoClient = null;
let _mongoDb = null;

// shared

async function getMongoDb() {
    // Uses singleton connection
    try {
        if (_mongoDb) return _mongoDb;
        // host includes port if needed
        const {username, dbname, host, password} = config.data;

        // SECRET INFO: DEV ONLY: NEVER COMMIT WITH THIS LINE NOT COMMENTED OUT
        // const warn = log.clr.alert(`!!!DONT COMMIT WITHOUT COMMENTING OUT!!!\nSECRET INFO\n`)
        // log.info(`${warn}config ${config.json(true)}`);

        const mongoUrl = `mongodb://${username}:${password}@${host}`;
        let client = null;
        try {
            client = await MongoClient.connect(mongoUrl, {
                useUnifiedTopology: true,
            });
            _mongoClient = client;
            _mongoDb = client.db(dbname);
        } catch (err) {
            if (DEBUG) console.log('Mongo Connection Error', err.message, err.stack);
        }
    } catch (err) {
        console.log('getMongoDb Error (MA36):', err.message, err.stack);
    }
    return _mongoDb;
}

// Steps

export class MongoCleanup extends NDocStep {
    async execute() {
        try {
            if (DEBUG) log.op('(MC62) closing mongo');
            if (_mongoClient) _mongoClient.close();
            _mongoDb = null;
            _mongoClient = null;

            const retport = {
                status: 'success',
                success: true,
                doc: new NovemDoc({
                    doctype: "report",
                    dict: {
                        actionPerformed: "MongoCleanup",
                        success: true,
                        status: 'success',
                    },
                }),
            }

            log.debug(`cleanup ${prettyJson(retport)}`)
            return retport;
        } catch (err) {
            const errport = {
                status: 'error',
                error: true,
                message: err.message,
            };
            log.debug(`cleanup error ${prettyJson(errport)}`, err.stack);
            return errport;
        }

    }
}

export class MongoDeleteStep extends NDocStep {
    async execute(opts) {
        /* {
            doc: NovemDoc w/
                collection: we need the collection name
                query: mongo query
        }
        */
        let status = 'normal';
        let message = null;
        const { doc } = opts;
        const collectionName = doc.get('collection');
        const query = doc.get('query', {});
        const queryName = doc.get('queryName', 'unknownQuery');
        // doc should be mongo query
        let queryResultDoc = null;
        try {
            log.query(`[119] query (${queryName}) on '${collectionName}', ${JSON.stringify(query, null, 4)}`);
            const mongoDb = await getMongoDb();
            const collection = await mongoDb.collection(collectionName);
            const deleteResult = await collection.deleteMany(query);
            log.answer(`[129] deleteResult: ${prettyJson(deleteResult)} records found`);

            queryResultDoc = new NovemDoc({
                doctype: queryName,
                dict: { deleteResult },
            });
        } catch (err) {
            console.log('ERROR MongoQueryStep', err.stack);
            status = 'error';
            message = err.message;
            throw (err);
        }
        return {
            doc: queryResultDoc,
            status,
            error: status==='error' ? true : false,
            success: status==='success' ? true : false,
            message,
        };
    }
}

export class MongoLazyConnect extends NDocStep {
    async execute(opts) {
        const { doc } = opts;
        const mongoDb = await getMongoDb();

        return {
            status: mongoDb ? 'normal' : 'error',
            message: mongoDb ? null : 'Cannot get MongoDB instance.',
            doc,
        };
    }
}

export class MongoSaveStep extends NDocStep {
    async execute(opts) {
        const {
            doc, // required: doc to save
            doctype, //
        } = opts;
        let status = 'normal';
        let message = null;
        try {
            if (DEBUG) log.debug('(ms170) save', doc.json(true));
            const mongoDb = await getMongoDb();
            const mongoId = doc.get('_id', null);
            const dict = doc.data;
            const collectionName = doctype ? doctype : doc.getMeta('doctype', 'misc');
            const collection = await mongoDb.collection(collectionName);
            if  (!mongoId) {
                await collection.insertOne(dict);
            } else {
                const savedict = {
                    ...dict,
                    //_id:undefined
                }
                delete savedict._id;
                if (DEBUG) log.debug(`(ms179) replacing ${mongoId} with ${JSON.stringify(savedict, null, 4)}`)
                const reciept = await collection.replaceOne({
                        _id: {
                            $eq: ObjectID(mongoId)
                        }
                    },
                    savedict,
                );
                log.detail(`(ms187) replace reciept: ${JSON.stringify(reciept, null, 4)}`)
            }
        } catch (err) {
            if (DEBUG) log.error(`ERROR MongoSaveStep:\n${err.stack}`);
            status = 'error';
            message = err.message;
        }
        // log.debug(`reply ${prettyJson({message, status, doc:doc.data})}`)
        return { message, status, doc, };
    }
}

/// /
// Query Step
export class MongoQueryStep extends NDocStep {
    async execute(opts) {
        /* {
            doc: NovemDoc w/
                collection: collection to use
                query: mongo query
        }
        */
        let status = 'normal';
        let message = null;
        const { doc } = opts;
        const collectionName = doc.get('collection');
        const query = doc.get('query', {});
        const queryName = doc.get('queryName', 'unknownQuery');
        // doc should be mongo query
        let queryResultDoc = null;
        try {
            log.query(`[MA119] query (${queryName}) on '${collectionName}', ${JSON.stringify(query, null, 4)}`);
            const mongoDb = await getMongoDb();
            const collection = await mongoDb.collection(collectionName);
            const cursor = await collection.find(query);
            const queryResult = await cursor.toArray();
            log.answer(`[MA129] queryResult: ${queryResult.length} records found`);

            queryResultDoc = new NovemDoc({
                doctype: queryName,
                dict: { queryResult },
            });
        } catch (err) {
            console.log('ERROR MongoQueryAction', err.stack);
            status = 'error';
            message = err.message;
            throw (err);
        }
        return {
            doc: queryResultDoc,
            status,
            error: status==='error' ? true : false,
            success: status==='success' ? true : false,
            message,
        };
    }
}
// kits arguments must be arrays
export const mongoRecipeChapter = {
    delete: [MongoLazyConnect, MongoDeleteStep],
    save: [MongoLazyConnect, MongoSaveStep],
    saveAndArchive: [ MongoLazyConnect, MongoSaveStep,],
    query: [MongoLazyConnect, MongoQueryStep],
    cleanup: [MongoCleanup],
};
