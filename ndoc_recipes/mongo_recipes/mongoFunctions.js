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

export async function mongoQuery(opts) {
    const {queryName, collection, query } = opts;
    try {
        // do query
        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo: mongoRecipeChapter,
            }
        });

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

        if (queryResult.length > 0) {
            answerSummary.push(`(mF38) Example Item #0 ${shortJson(queryResult[0])}`)
        }
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
        doctype, // optional: overrides doctype
    } = opts;

    try {
        // do query
        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo: mongoRecipeChapter,
            }
        });

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

export async function mongoCleanup(opts) {
    // opts not used currently
    const cleanupReport = await ndocRecipe.finish();
    return cleanupReport;
}

// I think I want to move this or have this use a NovemDoc decomposition
// member.
export async function decomposeQueryAnswer(answerDoc, docConstructor) {
    // returns this if already a NovemDoc
    answerDoc = NovemDoc.from_thing(answerDoc);
    log.info("answerDoc", answerDoc.json(true))
    // get the query result and turn into list of docs
    if (!docConstructor) docConstructor = NovemDoc;
    const qR = answerDoc.get('queryResult');
    const docList = qR.map( (item) => {
        return docConstructor.from_dict(item);
    });
    return docList;
}

export default {
    mongoSave,
    mongoQuery,
}
