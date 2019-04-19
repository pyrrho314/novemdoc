const { NovemDoc } = require('./novemdoc');

const config = {
    dbname: 'misc',
    host: 'localhost:27017',
}

const configDoc = new NovemDoc({
        doctype: 'config',
        dict: config,
        });

module.exports = configDoc;
