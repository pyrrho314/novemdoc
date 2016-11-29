const NovemDoc = require("../novemdoc.js").NovemDoc;

var tehdict = 
    { 
        foo : {
            one:1,
            two:2,
            three:3
            },
        bar : [9,8,7,6,5],
    };

var nd = new NovemDoc({
                        doctype: "test_doc",
                        dict: tehdict
                      });

console.log("dt18:", nd.json(true));