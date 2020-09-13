import mongodb from 'mongodb';
import NovemDoc from '../../novemdoc.js';
import NDocStep from '../NDocStep.js';

import config from '../../config.js'

import pkgLogger from '../../pkgLogger.js';

const log = pkgLogger.subLogger('MS');

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

        log.info(`MS41 config ${config.data}`);

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

// Actions

export class MongoCleanup extends NDocStep {
    async execute() {
        try {
            if (DEBUG) log.op('(MC62) closing mongo');
            _mongoClient.close();
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

            log.debug(`cleanup ${retport}`)
            return retport;
        } catch (err) {
            const errport = {
                status: 'error',
                error: true,
                message: err.message,
            };
            log.debug(`cleanup ${retport}`)
            return errport;
        }

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
        if (DEBUG) console.log('opts [MA75]:', opts);
        if (DEBUG) console.log('opts [MA77]', doc.data);
        try {
            if (DEBUG) console.log('[MA78] save', doc.json(true));
            const mongoDb = await getMongoDb();
            const dict = doc.data;
            const collectionName = doctype ? doctype : doc.getMeta('doctype', 'misc');
            const collection = await mongoDb.collection(doctype);
            await collection.insertOne(dict);
        } catch (err) {
            if (DEBUG) console.log('ERROR MongoSaveAction', err.stack);
            status = 'error';
            message = err.message;
        }
        return { message, status, doc, };
    }
}

/// /
// Query Action
export class MongoQueryStep extends NDocStep {
    async execute(opts) {
        let status = 'normal';
        let message = null;
        const { doc } = opts;
        const doctype = doc.get('doctype');
        const query = doc.get('query', {});
        if (DEBUG) log.info('[MA116] doctype:', doctype);
        // doc should be mongo query
        let queryResultDoc = null;
        try {
            log.query(`[MA119] query: ${doctype}, ${JSON.stringify(query, null, 4)}`);
            const mongoDb = await getMongoDb();
            const collection = await mongoDb.collection(doctype);
            const cursor = await collection.find(query);
            const queryResult = await cursor.toArray();
            log.answer(`[MA129] queryResult: ${queryResult.length} records found`);

            queryResultDoc = new NovemDoc({
                doctype: 'detailsList',
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
    save: [MongoLazyConnect, MongoSaveStep],
    saveAndArchive: [ MongoLazyConnect, MongoSaveStep,],
    query: [MongoLazyConnect, MongoQueryStep],
    cleanup: [MongoCleanup],
};
