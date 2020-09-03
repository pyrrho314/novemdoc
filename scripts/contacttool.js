#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import {NDocRecipe} from '../ndoc_recipes/NDocRecipe.js';
import {mongoRecipeChapter} from '../ndoc_recipes/mongo_recipes/MongoSteps.js';
import NovemDoc from '../novemdoc.js'

import packageLogger from '../pkgLogger.js';
const log = packageLogger.subLogger('cntctool');
//packageLogger.setDebug("*")

(async () => {
    try {
        const doc = new NovemDoc();

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        doc.set("this.is.a.test.key", "valueSettingData");

        console.log("Doc", doc.json(true))

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

        log.debug("allContactsQuery", allContactsQuery.data);
        const answer = await ndocRecipe.execute('mongo.query', allContactsQuery);

        log.answer('Query Result', answer);

        const report = await ndocRecipe.finish();
        log.answer(`Cleanup Report ${JSON.stringify(report, null, 4)}`);
    } catch (err) {
        log.error('contacttool query Nope:', err.message, err.stack);
    }
})();
