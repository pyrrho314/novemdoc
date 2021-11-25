import { NovemDoc } from './novemdoc.js';
import defaultsDeep from 'lodash/defaultsDeep.js';
import {prettyJson} from './misc/pretty.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkglog from './pkgLogger.js';
const log = pkglog.subLogger('config');

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

export function loadConfig(configPath) {
    const localPath
        = path.normalize(path.join(__dirname, './local.novemdoc.config.js'));

    let localConfig = null;
    let patchConfig = null

    try {
        const raw = fs.readFileSync(localPath);
        localConfig = JSON.parse(raw)
        //const localConfig = importedLocalConfig.default;
        // never leave on, secret info:console.log("config7: localConfig", localConfig);
    } catch (error){
        // there is no local config
        // too much: we don't neet this... config set from env log.info('no local novemdoc config:', error.message);
    }

    if (configPath) {
        try {
            const raw = fs.readFileSync(configPath);
            patchConfig = JSON.parse(raw)
            //const localConfig = importedLocalConfig.default;
            // never leave on, secret info:console.log("config7: localConfig", localConfig);
        } catch (error){
            // there is no local config
            // console.log('(c52) env config warning error:', error.message)
        }
    }

    if (localConfig) {
        // SENSITIVE log.load(`config: ${prettyJson(localConfig)}`);
        config = configDoc.applyDeep(localConfig);
    }

    if (patchConfig) {
        // SENSITIVE log.load(`(c62) patch config: ${prettyJson(patchConfig)}`);
        config = configDoc.applyDeep(patchConfig);
    }
    // sensitive information log.load(`(c64) loaded config ${configDoc.json(true)}`);
};

// letting the client call it so dotenv can be used
// loadLocal(envPath);

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
