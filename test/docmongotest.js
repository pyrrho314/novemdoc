// requires node
// must be called before anyone loads NovemMongo
const novemDocConfig = require('../config');
novemDocConfig.set('dbname', 'test');
(async () => {
    const {NovemMongo} = require('../novem_db/novemmongo.js');
    const {NovemDoc} = require("../novemdoc.js");
    
    var data = {
        property: "pros",
        name: "first",
        thing: {hello:"goodbye"},
        timestamp: new Date(),
    }
    
    var nd = new NovemDoc({
                            doctype: "document",
                            dict: data
                          });
    console.log('TestDocument', nd.json(true));

    const answer = await nd.mongoSave();
    console.log('mongoSave Answer', answer)
    
    console.log('nd', nd.json(true));
    await NovemMongo.close_connections();
})();
