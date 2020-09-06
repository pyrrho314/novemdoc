import { NovemDoc } from './novemdoc.js';
import defaultsDeep from 'lodash/defaultsDeep.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
import log from './pkgLogger.js';

const DEBUG = true;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let config = {
    dbname: 'misc',
    host: 'localhost:27017',
}

const configDoc = new NovemDoc({
        doctype: 'config',
        dict: config,
});

if (DEBUG) log.init("config.js loading...");

export function loadLocal(configPath = './local.novemdoc.config.js') {
    configPath = path.normalize(path.join(__dirname, configPath));
    let localConfig = null;
    try {
        const raw = fs.readFileSync(configPath);
        localConfig = JSON.parse(raw)

        //const localConfig = importedLocalConfig.default;
        // never leave on, secret info:console.log("config7: localConfig", localConfig);
    } catch (error){
        // there is no local config
        console.log('local config error:', error.message, error.stack)
    }
    log.load(`config: ${localConfig}`);
    if (localConfig) {
        config = configDoc.applyDeep(localConfig);
    }
};

loadLocal();

export default configDoc;

// EXAMPLE local.novemdoc.config.js
//  These settings will have to match trunk/mongoDocker/.env
//  @@REFACTOR: Load these setting from mongoDocker/.env instead of duplicating.
//              However, still support he .js setting for when mongo is not
//              semi-local in docker.
// const config = {
//     dbname: 'novemDocTest',
//     host: 'localhost:9017', // docker start separately
//     username: 'root',
//     password: 'trunkdb',
// }
//
// module.exports = config;
