const { NovemDoc } = require('./novemdoc');
const defaultsDeep = require('lodash/defaultsDeep')

let localConfig = null;
try {
    localConfig = require('./local.novemdoc.config.js');
    // never leave on, secret info:console.log("config7: localConfig", localConfig);
} catch (error){
    // there is no local config
    throw error;
}

let config = {
    dbname: 'misc',
    host: 'localhost:27017',
}

if (localConfig) {
    config = defaultsDeep(localConfig, config);
}

const configDoc = new NovemDoc({
        doctype: 'config',
        dict: config,
        });

module.exports = configDoc;

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
