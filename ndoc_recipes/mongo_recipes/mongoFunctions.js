import path from 'path';
import { fileURLToPath } from 'url';
import get from 'lodash/get.js';
import set from 'lodash/set.js';
import NovemDoc from '../../novemdoc.js'
import packageLogger from '../../pkgLogger.js';
import {NDocRecipe} from '../NDocRecipe.js';
import {mongoRecipeChapter} from './mongoSteps.js';
import {prettyJson, shortJson} from '../../misc/pretty.js';

const log = packageLogger.subLogger('nMongoFunc');

const ndocRecipe = new NDocRecipe({
    cookBook: {
        mongo: mongoRecipeChapter,
    }
});

// @@NOTE: this could be important to thoroughly engineer, e.g. a trash collection to curate deletion
export async function mongoDelete(opts) {
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

        const answer = await ndocRecipe.execute('mongo.delete', theQuery);

        const queryResult = answer.doc.get('queryResult', []);
        const answerSummary = queryResult.map( (item) => {
            return `answer: ${item.handle} created: ${get(item, 'stats.created')} logged  in ${get(item, 'stats.numLogins')} times`;
        });

        // ONLY USEFUL FOR DEV
        // if (queryResult.length > 0) {
        //     answerSummary.push(`(mF38) Example Item #0 ${shortJson(queryResult[0])}`)
        // }

        log.answer(
    `(mF36) Query Result (${answerSummary.length} found):
    \t${answerSummary.join("\n\t")}
    |end of Query Result|`);

        return answer;

    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
        ndocRecipe.finish();
    }
}

export async function mongoQuery(opts) {
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
        const answerSummary = queryResult.map( (item) => {
            return `answer: ${item.handle} created: ${get(item, 'stats.created')} logged  in ${get(item, 'stats.numLogins')} times`;
        });

        // ONLY USEFUL FOR DEV
        // if (queryResult.length > 0) {
        //     answerSummary.push(`(mF38) Example Item #0 ${shortJson(queryResult[0])}`)
        // }

        log.answer(
    `(mF36) Query Result (${answerSummary.length} found):
    \t${answerSummary.join("\n\t")}
    |end of Query Result|`);

        return answer;

    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
        ndocRecipe.finish();
    }
}

export async function mongoSave(opts) {
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
