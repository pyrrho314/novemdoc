import path from 'path';
import { fileURLToPath } from 'url';
import NovemDoc from '../../novemdoc.js'
import packageLogger from '../../pkgLogger.js';
import {NDocRecipe} from '../NDocRecipe.js';
import {mongoRecipeChapter} from './mongoSteps.js';

const log = packageLogger.subLogger('nMongoFunc');

export async function mongoQuery(opts) {
    const {doctype, query } = opts;
    try {
        // do query
        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo: mongoRecipeChapter,
            }
        });

        const theQuery = new NovemDoc({
            doctype,
            data: query,
        });

        log.debug(`theQuery  ${theQuery.data}`);
        const answer = await ndocRecipe.execute('mongo.query', theQuery);
        const queryResult = answer.doc.get('queryResult', []);
        const answerSummary = queryResult.map( (item) => {
            return `answer: ${item._id} (${item._ndoc.doctype})`;
        });

        if (queryResult.length > 0) {
            answerSummary.push(`Example Item #0 ${queryResult[0]}`)
        }
        log.answer(
    `(ct43) Query Result (${answerSummary.length} found):
    \t${answerSummary.join("\n\t")}
    |end of Query Result|`);

        log.answer(`Cleanup Report ${JSON.stringify(report, null, 4)}`);
    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
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

        const answer = await ndocRecipe.execute('mongo.save', {doc});
        log.answer(
            `(ct43) Saved Result (${JSON.stringify(answer, null, 4)}))`);

        //const report = await ndocRecipe.finish();

        log.answer(`Cleanup Report ${JSON.stringify(report, null, 4)}`);
        return report;
    } catch (err) {
        log.error('contacttool savey Nope:', err.message, err.stack);

    }
}

export async function mongoCleanup(opts) {
    // opts not used currently
    const cleanupReport = await ndocRecipe.finish();
    return cleanupReport;
}

export default {
    mongoSave,
    mongoQuery,
}
