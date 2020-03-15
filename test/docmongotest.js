// requires node
// must be called before anyone loads NovemMongo
const novemDocConfig = require('../config');
console.log("config", novemDocConfig.json());
novemDocConfig.set('dbname', 'test2');
novemDocConfig.set('host', 'localhost:9017');
novemDocConfig.set('username', "root");
novemDocConfig.set('password', "trunkdb");
let NovemMongo, NovemDoc;
(async () => {
    try {
        ({NovemMongo} = require('../novem_db/novemmongo.js'));
        ({NovemDoc} = require("../novemdoc.js"));

        var data = {
            property: "pros",
            name: "first",
            thing: {hello:"goodbye"},
            timestamp: new Date(),
        }

        console.log('create novemdoc')
        var nd = new NovemDoc({
                                doctype: "document",
                                dict: data
                              });

        const answer = await nd.mongoSave();

        console.log('saved', answer);

        const allDocs = await NovemDoc.mongoFindAll(
            {
                doctype: 'document',
                returnDicts: false,
            });

        console.log('alldocs---------');
        allDocs.forEach ((item) => {
            console.log(item.json(true));
        });
        console.log('---------alldocs');

        const oneDoc = await NovemDoc.mongoFindOne(
            {
                doctype: 'document',
            });

        console.log('onedoc----------\n',
                    oneDoc.json(true),
                    '\n----------onedoc');

        await NovemMongo.close_connections();
    } catch (err) {
        console.log("Doc Mongo Test Error:", err.message, err.stack);
        await NovemMongo.close_connections();
    }
})().catch( async (err) => {
    console.log("----------------");
    console.log("Error:", err.message);
    console.log("----------------");
    console.log(err.stack);
    await NovemMongo.close_connections();

});
