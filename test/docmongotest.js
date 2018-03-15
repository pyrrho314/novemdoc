// requires node
// must be called before anyone loads NovemMongo
const novemDocConfig = require('../config');
novemDocConfig.set('dbname', 'test');

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
                doctype: 'document'    
            });
            
        console.log('alldocs', allDocs);
        
        await NovemMongo.close_connections();
    } catch (err) {
        console.log("Doc Mongo Test Error:", err.message, err.stack);
        await NovemMongo.close_connection();
    }
})();
