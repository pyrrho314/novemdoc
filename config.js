import { NovemDoc } from './novemdoc.js';
import defaultsDeep from 'lodash/defaultsDeep.js';
import {prettyJson} from './misc/pretty.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkglog from './pkgLogger.js';
const log = pkglog.subLogger('config');

const DEBUG = true;

// @@BRANCH: development-FE
// @@FRONTEND: babel doesn't like this and we don't use them... branch for now
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// let config = {
//     dbname: 'misc',
//     host: 'localhost:27017',
// }

let config = {
    appType: 'NovemDocThroughputApp',
}
const configDoc = new NovemDoc({
        doctype: 'config',
        dict: config,
});

if (DEBUG) log.init("config.js loading...");

// just isn't called on FE
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
        console.log('local config error:', error.message, error.stack)
    }

    if (configPath) {
        try {
            const raw = fs.readFileSync(configPath);
            patchConfig = JSON.parse(raw)
            //const localConfig = importedLocalConfig.default;
            // never leave on, secret info:console.log("config7: localConfig", localConfig);
        } catch (error){
            // there is no local config
            console.log('env config error:', error.message, error.stack)
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
