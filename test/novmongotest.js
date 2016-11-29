var NovemMongo = require("../novem_db/novemmongo")
var NovemDoc = require("../novemdoc.js").NovemDoc;

var data = {
    property: "pros",
    name: "first",
    thing: {hello:"goodbye"}
}

var novem_mongo = new NovemMongo(
    {
        ready: function(nmi)
        {
            console.log("DAM14:", data);
            nmi.save_dict(
                {
                    collection: "thing",
                    dict:data,
                    ready: function (err,r) {nmi.close();}
                });
        }
    });
    

/*
var nd = new NovemDoc({
                        doctype: "thing",
                        dict: data
                      });
                      
nd.mongo_save(nd.dict)
*/