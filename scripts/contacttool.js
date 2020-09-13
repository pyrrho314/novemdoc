#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import {NDocRecipe} from '../ndoc_recipes/NDocRecipe.js';
import {mongoRecipeChapter} from '../ndoc_recipes/mongo_recipes/mongoSteps.js';
import NovemDoc from '../novemdoc.js'

import packageLogger from '../pkgLogger.js';
packageLogger.setDebug("*");
const log = packageLogger.subLogger('cntctool');
//packageLogger.setDebug("*")

(async () => {
    try {
        const doc = new NovemDoc();

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        doc.set("this.is.a.test.key", "valueSettingData");

        log.info(`Doc: ${doc.json(true)}`);

        // do query
        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo: mongoRecipeChapter,
            }
        });

        const allContactsQuery = new NovemDoc({
            doctype: 'contactQuery',
            dict: {
                doctype: 'contactRequest',
                query: {
                    '_ndoc.doctype': { $eq: 'contactRequest'},
                },
            },
        });

        log.debug(`allContactsQuery  ${allContactsQuery.data}`);
        const answer = await ndocRecipe.execute('mongo.query', allContactsQuery);

        const answerSummary = answer.doc.get('queryResult', []).map( (item) => {
            return `CONTACT REQUEST: ${item.company} (${item.wholeName})`;
        });

        log.answer(
`(ct43) Query Result (${answerSummary.length} found):
\t${answerSummary.join("\n\t")}
|end of Query Result|`);

        const report = await ndocRecipe.finish();
        log.answer(`Cleanup Report ${JSON.stringify(report, null, 4)}`);
    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
    }
})();
