/* executeRecipe routines for mongo — index migration and related work.
   Cookbook entries hold pre-built NDocStep instances (not classes).
*/

import mongodb from 'mongodb';
import config from '../../config.js';
import NovemDoc from '../../novemdoc.js';
import NDocStep from '../NDocStep.js';
import { prettyJson } from '../../misc/pretty.js';
import pkgLogger from '../../pkgLogger.js';

const log = pkgLogger.subLogger('mR');

const { MongoClient } = mongodb;
const ObjectID = mongodb.ObjectID;

const DEBUG = true;

let _mongoClient = null;
let _mongoDb = null;

const MIGRATION_COLLECTION_NAME = '_migration_records';

async function getMongoDb() {
    // Uses singleton connection — same pattern as mongoSteps.js; consolidate later.
    try {
        if (_mongoDb) return _mongoDb;
        const { username, dbname, host, password } = config.data;

        const mongoUrl = `mongodb://${username}:${password}@${host}`;
        try {
            const client = await MongoClient.connect(mongoUrl, {
                useUnifiedTopology: true,
            });
            _mongoClient = client;
            _mongoDb = client.db(dbname);
        } catch (err) {
            if (DEBUG) console.log('Mongo Connection Error', err.message, err.stack);
        }
    } catch (err) {
        console.log('getMongoDb Error (mR36):', err.message, err.stack);
    }
    return _mongoDb;
}

async function closeMongoDb() {
    if (_mongoClient) _mongoClient.close();
    _mongoDb = null;
    _mongoClient = null;
}

export async function mongoSave(input) {
    const { collectionName, doc: document } = input;
    try {
        const doc = NovemDoc.from_thing(document);
        const resolvedCollectionName = collectionName ?? doc.getMeta('doctype', 'misc');
        const mongoId = doc.get('_id', null);
        const dict = doc.data;

        if (DEBUG) log.debug('(mR48) save', doc.json(true));

        const mongoDb = await getMongoDb();
        const collection = await mongoDb.collection(resolvedCollectionName);

        if (!mongoId) {
            await collection.insertOne(dict);
        } else {
            const savedict = { ...dict };
            delete savedict._id;
            if (DEBUG) {
                log.debug(`(mR59) replacing ${mongoId} with ${JSON.stringify(savedict, null, 4)}`);
            }
            const receipt = await collection.replaceOne(
                { _id: { $eq: ObjectID(mongoId) } },
                savedict,
            );
            log.detail(`(mR65) replace receipt: ${JSON.stringify(receipt, null, 4)}`);
        }

        return {
            ...input,
            collectionName: resolvedCollectionName,
            document: doc,
            saveStatus: 'normal',
            saveMessage: null,
        };
    } catch (err) {
        if (DEBUG) log.error(`ERROR mongoSave:\n${err.stack}`);
        return {
            ...input,
            saveStatus: 'error',
            error: true,
            saveMessage: err.message,
        };
    }
}

export async function mongoQuery(input) {
    const { collectionName, query = {}, queryName = 'unknownQuery' } = input;
    try {
        log.query(`(mR88) query (${queryName}) on '${collectionName}', ${JSON.stringify(query, null, 4)}`);

        const mongoDb = await getMongoDb();
        const collection = await mongoDb.collection(collectionName);
        const cursor = await collection.find(query);
        const queryResult = await cursor.toArray();

        log.answer(`(mR95) queryResult: ${queryResult.length} records found`);

        return {
            ...input,
            queryResult,
            queryStatus: 'normal',
            queryMessage: null,
        };
    } catch (err) {
        log.error('ERROR mongoQuery', err.stack);
        return {
            ...input,
            queryStatus: 'error',
            error: true,
            queryMessage: err.message,
        };
    }
}

export async function mongoDelete(input) {
    const { collectionName, query = {}, queryName = 'unknownQuery' } = input;
    try {
        log.query(`(mR115) delete (${queryName}) on '${collectionName}', ${JSON.stringify(query, null, 4)}`);

        const mongoDb = await getMongoDb();
        const collection = await mongoDb.collection(collectionName);
        const deleteResult = await collection.deleteMany(query);

        log.answer(`(mR121) deleteResult: ${prettyJson(deleteResult)}`);

        return {
            ...input,
            deleteResult,
            deleteStatus: 'normal',
            deleteMessage: null,
        };
    } catch (err) {
        log.error('ERROR mongoDelete', err.stack);
        return {
            ...input,
            deleteStatus: 'error',
            error: true,
            deleteMessage: err.message,
        };
    }
}

/* Migration Support.

    Note, specific migration logic is decided by the caller.
    The migration recipe routines manage migrations as string names in two steps.
    1. mongoCheckMigrationState
    2. mongoMigrateIf

    The caller will supply:
        * calculateNeededMigrations(..)
            * Will be called by the mongoCheckMigrationState step with:
                * desiredMigration      - string name of desired migration
                * indexInfo             - index info from collection
                * migrationReciepts     - list of objects of previous migration reciepts
                * existingMigrations    - list of names for previous migrations
        * executeNeededMigrations(..)
            * Will be called by the mongoMigrateIf step with:   
                * ...input         - all throughput elements unless overriden below
                * collectionName    - string collection name
                * neededMigrations  - list of migrations to execute, in order
            * Returns a list of migration reciepts which are added to migrationRecord and saves. 
    
    Note: The caller supplies and consumes the migrationReciepts, allowing any migration approach needed by different collections. These routines only keep these records and a containing document with timestamps and potentially other book keeping information.
*/
export async function getMigrationRecord(migrationRecordRq) {
    const { collectionName } = migrationRecordRq;
    const migrationQueryResults = await mongoQuery({
        collectionName: MIGRATION_COLLECTION_NAME,
        query: {
            migrationCollection: collectionName,
        },
    });
    const { queryResult } = migrationQueryResults;

    console.log('(mr219)', migrationQueryResults);

    const migrationRecord = queryResult.length > 0 ? queryResult[0] : null;
    return migrationRecord;
}

export async function saveMigrationRecord(migrationRecord) {
    await mongoSave({
        collectionName: MIGRATION_COLLECTION_NAME,
        doc: {
            ...migrationRecord,
            migrationDate: new Date(),
            migrationTime: new Date().getTime(),
            timestamp: Date.now(),
        }
    });
}

/// Recipe Routines that pass input to out (ammend out).
export async function mongoCheckMigrationState(input) {
    console.log('(mR60) mongoMigrationCheck', input);
    const {
        collectionName,
        desiredMigration,
        calculateNeededMigrations,
    } = input;
    try {
        const mongoDb = await getMongoDb();
        const collection = await mongoDb.collection(collectionName);
        const indexInfo = await collection.indexes();
        // Get Last Migration
        const migrationRecord = await getMigrationRecord({collectionName});
        const migrationReciepts = migrationRecord?.migrationReciepts;
        const existingMigrations = migrationReciepts?.map(reciept => reciept.migrationName);
        const neededMigrations = await calculateNeededMigrations({
            collectionName,
            desiredMigration,
            indexInfo,
            migrationReciepts,
            existingMigrations,
        });
        console.log('indexInfo', neededMigrations);
        return {
            ...input,
            indexInfo,
            desiredMigration,
            neededMigrations,
        };
    } catch (err) {
        log.error('mongoMigrateIfNeeded error\n', err.stack);
        return {
            ...input,
            status: 'error',
            error: true,
            message: err.message,
        };
    }
}

export async function mongoMigrateIf(input) {
    const {
        collectionName,
        executeNeededMigrations,
        // desiredMigration,
        // indexInfo,
        // neededMigrations,
    } = input;
    try {
        log.info('(mR74) mongoMigrateIndexIf input', input);
        const mongoDb = await getMongoDb();
        const collection = await mongoDb.collection(collectionName);
        
        const newMigrationReciepts = await executeNeededMigrations({
            ...input,
            mongoCollection: collection,
        });

        const migrationRecord = await getMigrationRecord({
            collectionName,
        });
        const oldReciepts = migrationRecord?.migrationReciepts || [];
        const migrationReciepts = [...oldReciepts, ...newMigrationReciepts];

        await saveMigrationRecord({
            ...migrationRecord,
            migrationCollection: collectionName,
            migrationReciepts,
            migrationDate: new Date(),
            migrationTime: new Date().getTime(),
            timestamp: Date.now(),
        });

        return {
            ...input,
            migrationReciepts,
        }
    } catch (err) {
        log.error('mongoMigrateIndexIf Error:\n', err.stack);
        return {
            ...input,
            status: 'error',
            error: true,
            message: err.message,
        };
    }
}
//
// MIGRATION SUPPORT ENDS HERE //
////////////////////////////////

export async function mongoCleanup(input = {}) {
    try {
        if (DEBUG) log.op('(mR52) closing mongo');
        await closeMongoDb();
        return {
            ...input,
            mongoCleanup: {
                actionPerformed: 'mongoCleanup',
                status: 'success',
                success: true,
            },
        };
    } catch (err) {
        log.error(`(mR66) cleanup error: ${err.message}`, err.stack);
        return {
            ...input,
            mongoCleanup: {
                actionPerformed: 'mongoCleanup',
                status: 'error',
                error: true,
                message: err.message,
            },
        };
    }
}



//////////////////////////
///// DEFAULT EXPORT /////
/////    COOKBOOK    /////
export const mongoRoutinesChapter = {
    save: [
        new NDocStep({ routine: mongoSave }),
    ],
    saveAndArchive: [
        new NDocStep({ routine: mongoSave }),
    ],
    query: [
        new NDocStep({ routine: mongoQuery }),
    ],
    delete: [
        new NDocStep({ routine: mongoDelete }),
    ],
    migrateIfNeeded: [
        new NDocStep({ routine: mongoCheckMigrationState }),
        new NDocStep({ routine: mongoMigrateIf }),
    ],
    cleanup: [
        new NDocStep({ routine: mongoCleanup }),
    ],
};
