// requires node

var NovemMongo = require("../novem_db/novemmongo")
//var NovemDoc = require("../novemdoc.js").NovemDoc;

var data = {
    property: "pros",
    name: "first",
    thing: {hello:"goodbye"}
}

// var novem_mongo = new NovemMongo(
//     {
//         ready: function(nmi)
//         {
//             console.log("DAM14: Mongo Loaded");
//             /*
//             nmi.save_dict(
//                 {
//                     collection: "thing",
//                     dict:data
//                 });
//             */
//         }
//     });

var nd = new NovemDoc({
                        doctype: "document",
                        dict: data
                      });
console.log('nd.json', nd.json(true));


