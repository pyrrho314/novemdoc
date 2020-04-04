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
