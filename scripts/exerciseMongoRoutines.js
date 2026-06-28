#!/usr/bin/env node
/* Exercise mongoRoutines — executeRecipe path (mongoMigrate cookbook).
*/
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { NDocRecipe } from '../ndoc_recipes/NDocRecipe.js';
import { mongoRoutinesChapter } from '../ndoc_recipes/mongo_recipes/mongoRoutines.js';
import { ndocConfig } from '../index.js';
import { prettyJson } from '../misc/pretty.js';
import packageLogger from '../pkgLogger.js';

packageLogger.setDebug('*');
const log = packageLogger.subLogger('exerciseMongoRoutines');

async function createPassageIndexes() {
    
}

(async () => {
    try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);

        const envPath = path.normalize(path.join(__dirname, '../../.env'));
        dotenv.config({ path: envPath });

        ndocConfig.set('dbname', process.env.MONGO_DB);
        ndocConfig.set('host', `${process.env.MONGO_HOST}:${process.env.MONGO_PORT}`);
        ndocConfig.set('username', process.env.MONGO_USERNAME);
        ndocConfig.set('password', process.env.MONGO_PASSWORD);

        const ndocRecipe = new NDocRecipe({
            cookBook: {
                mongo2: mongoRoutinesChapter,
            }
        });

        const input = {
            migrationName: 'passageIndexes',
            collectionName: 'testPassages',
            currentMigration: 1,

        };

        log.info(`input: ${prettyJson(input)}`);

        const result = await ndocRecipe.executeRecipe({
            recipeName: 'mongo2.migrateIfNeeded',
            input,
        });

        await ndocRecipe.executeRecipe({
            recipeName: 'mongo2.cleanup',
        });

        log.answer(`executeRecipe result:\n${prettyJson(result)}`);
    } catch (err) {
        log.error('exerciseMongoRoutines:', err.message, err.stack);
    }
})();
