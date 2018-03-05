var { NovemMongo } = require("../novem_db/novemmongo")
var { NovemDoc } = require("../novemdoc.js");

const packageLogger =  require("../pkgLogger");
const log = packageLogger.subLogger('novMongoTest');
var data = {
    property: "pros",
    name: "first",
    thing: {hello:"goodbye"}
}

var novemMongo = NovemMongo.get_instance();
    
novemMongo.then((nmi) => {
        log.log('data: %O', data);
        return nmi.saveDict({
            collection: "thing",
            dict: data,
        })
    });
    

/*
var nd = new NovemDoc({
                        doctype: "thing",
                        dict: data
                      });
                      
nd.mongo_save(nd.dict)
*/