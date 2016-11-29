const NovemMongo = require("../novem_db/novemmongo")
const NovemDoc = require("../novemdoc.js").NovemDoc;
const bcrypt = require("bcrypt-nodejs");

var user = { 
        username: 'callen314@gmail.com', 
        secret: 
        {
          passhash: bcrypt.hashSync("secret")
        },
        session:
        {
          token: null,
        },
        public:
        {
          displayName: 'Craig',
        },
        settings:
        {
          theme: "neutral"
        },
        private:
        {
        }
    };

var novem_mongo = new NovemMongo(
    {
        ready: function(nmi)
        {
            console.log("DAM14: Mongo Loaded");
        }
    });

var nd = new NovemDoc({
                        doctype: "user",
                        dict: user
                      });
                      
nd.mongo_save(
        {
            ready: function (nmi)
                {
                    nmi.close();
                }
        });
