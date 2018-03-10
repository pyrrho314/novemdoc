var { NovemMongo } = require("../novem_db/novemmongo")
var { NovemDoc } = require("../novemdoc.js");

const testCollection = 'thing';
const testDb = 'test';

(async () => {
    const packageLogger =  require("../pkgLogger");
    const log = packageLogger.subLogger('novMongoTest');
    var data = {
        property: "pros",
        name: "first",
        count: 0,
        thing: {hello:"goodbye"}
    }

    // Make Connection
    const nmi = await NovemMongo.get_connection({dbname: testDb});//new NovemMongo({dbname:'test'}).initiate();
    const answer = await nmi.saveDict({
        collection: testCollection,
        dict: {...data, madeBy:"async"},
    });
    
    // saved doc is returned, can have id in it, or otherwise be annoted
    log.info("saved as returned %O\n", answer);
    const savedId = answer.savedDoc._id;
    const fetchedDocs = await nmi.findDict({
        collection: testCollection,
        query: {},
    })
    log.info("fetched %d docs in collection %s.%s", fetchedDocs.length, testDb, testCollection);
    
    log.info("id", savedId);
    const fetchedDoc = await nmi.findOneDict({
        collection: testCollection,
        query: {
            _id: savedId
        }
    })
    log.detail('fetchedDoc %O', fetchedDoc);
    await nmi.release_connection();
    await nmi.close_connections();
})();
