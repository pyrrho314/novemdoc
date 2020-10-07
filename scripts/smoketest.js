#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import {NDocRecipe} from '../ndoc_recipes/NDocRecipe.js';
import {mongoRecipeChapter} from '../ndoc_recipes/mongo_recipes/mongoSteps.js';
import NovemDoc from '../novemdoc.js';
import {prettyJson} from '../misc/pretty.js';
import packageLogger from '../pkgLogger.js';
import {mongoSave, mongoQuery} from '../ndoc_recipes/mongo_recipes/mongoFunctions.js';


packageLogger.setDebug("*");
const log = packageLogger.subLogger('cntctool');

//packageLogger.setDebug("*")

(async () => {
    try {
        const doc = new NovemDoc({
            doctype: 'testDocument',
        });

        const doc2 = new NovemDoc({
            doctype: 'fooDoc',
        })

        // SET PROPERTIES
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        doc.set("this.is.a.test.key", "valueSettingData");
        doc2.push('this.is.a.list', "one");
        doc2.push('this.is.a.list', "two");

        log.info(`Doc: ${doc.json(true)}`);

        // MONGO
        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo: mongoRecipeChapter,
            }
        });

        // SAVE DOCUMENTS

        let answer = await mongoSave({doc});
        await mongoSave({doc});

        answer = await mongoSave({doc:doc2});

        // DO QUERY
        // do query

        const allContactsQuery = new NovemDoc({
            dict: {
                collection: 'testDocument',
                query: {
                    'this.is.a.test.key': { $eq: 'valueSettingData'},
                },
            },
        });

        log.debug(`testDocuments ${allContactsQuery.json(true)}`);

        answer = await ndocRecipe.execute('mongo.query', allContactsQuery);

        const answerSummary = answer.doc.get('queryResult', []).map( (item) => {
            return `CONTACT REQUEST: ${prettyJson(item)}`;
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
