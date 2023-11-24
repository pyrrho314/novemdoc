/* These are functional interfaces to the recipe system for convienience.
*/

import path from 'path';
import { fileURLToPath } from 'url';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import mongodb from 'mongodb';
import NovemDoc from '../../novemdoc.js'
import packageLogger from '../../pkgLogger.js';
import {NDocRecipe} from '../NDocRecipe.js';
import {mongoRecipeChapter} from './mongoSteps.js';
import {prettyJson, shortJson} from '../../misc/pretty.js';

const ObjectID = mongodb.ObjectID;
const log = packageLogger.subLogger('nMongoFunc');

const ndocRecipe = new NDocRecipe({
    cookBook: {
        mongo: mongoRecipeChapter,
    }
});

export async function mongoDeleteDoc(opts) {
    const {doc} = opts;
    // doc has to have an _id
    const docId = doc.get('_id');
    const query = {
        _id: {
            $eq: ObjectID(docId),
        }
    }
    const collection  = doc.doctype;
    const queryName = `delete_${collection}_query`;
    return await mongoDelete({queryName, collection, query});
}
// @@NOTE: this could be important to thoroughly engineer, e.g. a trash collection to curate deletion
export async function mongoDelete(opts) {
    // @@TODO: document the schema of this.
    
    const {queryName, collection, query } = opts;
    try {
        // @@TODO?: Get away of creating a NovemDoc for theQuery.
        const theQuery = new NovemDoc({
            doctype: queryName,
            data: {
                query,
                collection,
                queryName,
            },
        });

        log.debug(`(mF29) theQuery  ${JSON.stringify(theQuery.data, null, 4)}`);

        const answer = await ndocRecipe.execute('mongo.delete', theQuery);

        const queryResult = answer.doc.get('queryResult', []);
        
        /* this was only good for users
            const answerSummary = queryResult.map( (item) => {
            return `answer: ${item.handle} created: ${get(item, 'stats.created')} logged  in ${get(item, 'stats.numLogins')} times`;
        });
        */
        const answerSummary = queryResult.map( (item) => {
            return JSON.stringify(item);
        });
        // ONLY USEFUL FOR DEV
        // if (queryResult.length > 0) {
        //     answerSummary.push(`(mF38) Example Item #0 ${shortJson(queryResult[0])}`)
        // }

        log.answer(
    `(mF53) Query Result (${answerSummary.length} found):
    \t${answerSummary.join("\n\t")}
    |end of Query Result|`);

        return answer;

    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
        ndocRecipe.finish();
    }
}

export async function mongoQuery(opts) {
    // @@TODO: document the schema of this.

    const {queryName, collection, query } = opts;
    try {

        const theQuery = new NovemDoc({
            doctype:queryName,
            data: {
                query,
                collection,
                queryName,
            },
        });

        log.debug(`(mF29) theQuery  ${JSON.stringify(theQuery.data, null, 4)}`);

        const answer = await ndocRecipe.execute('mongo.query', theQuery);

        const queryResult = answer.doc.get('queryResult', []);
        /*  Only for TrunkUser: could maybe use a Trunkuser member?
            Would have to pass the target class.
        const answerSummary = queryResult.map( (item) => {
            return `answer: ${item.handle} created: ${get(item, 'stats.created')} logged  in ${get(item, 'stats.numLogins')} times`;
        });
        */

        const answerSummary = queryResult.map( (item) => {
            return JSON.stringify(item);
        });
    
        // ONLY USEFUL FOR DEV
        // if (queryResult.length > 0) {
        //     answerSummary.push(`(mF38) Example Item #0 ${shortJson(queryResult[0])}`)
        // }

        log.answer(
    `(mF95) Query Result (${answerSummary.length} found):
    \t${answerSummary.join("\n\t")}
    |end of Query Result|`);

        return answer;

    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
        ndocRecipe.finish();
    }
}

export async function mongoSave(opts) {
    // @@TODO: document the schema of this.

    const {
        doc, // required: doc to save
    } = opts;

    try {

        const answer = await ndocRecipe.execute('mongo.save', doc);

        log.answer(
            `(mF43) Saved Result (${JSON.stringify(answer, null, 4)}))`
        );

        //const report = await ndocRecipe.finish();

        return answer;
    } catch (err) {
        log.error('contacttool savey Nope:', err.message, err.stack);

    }
}

export async function mongoFinish(opts) {
    // opts not used currently
    const cleanupReport = await ndocRecipe.finish();
    return cleanupReport;
}

//////
//
/// utility functions below, not recipe execution function
//
//////
export async function decomposeSingleAnswer(answerDoc, docConstructor) {
    docConstructor = docConstructor ? docConstructor : NovemDoc;
    const qR = answerDoc.get('queryResult');
    if (!qR || qR.length === 0) return null;
    else {
        return docConstructor.from_dict(qR[0]);
    }

}

export async function decomposeQueryAnswer(answerDoc, docConstructor) {
    // returns this if already a NovemDoc
    answerDoc = NovemDoc.from_thing(answerDoc);
    // verbose log.info("(mF145) answerDoc", answerDoc.json(true))
    // get the query result and turn into list of docs
    if (!docConstructor) docConstructor = NovemDoc;
    const qR = answerDoc.get('queryResult');
    if (!qR) return null;
    const docList = qR.map( (item) => {
        return docConstructor.from_dict(item);
    });
    return docList;
}

export default {
    mongoSave,
    mongoQuery,
}
