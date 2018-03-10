
var { NovemMongo } = require("../../../novem_db/novemmongo")

const packageLogger =  require("../../../pkgLogger");
const log = packageLogger.subLogger('novMongoTest');

const testDb = 'test';
const testCollection = 'thing';
var data = {
    property: "pros",
    name: "first",
    count: 0,
    thing: {hello:"goodbye"}
}


describe('create and find doc', async () => {
    let nmi;
    // don't like before all, doesn't tell user
    
    
    test('connect with get_connection', async () => {
        nmi = await NovemMongo.get_connection({
            dbname:'test'
        }) // NovemMongo({dbname:'test'}).initiate();
        expect(nmi.mongodb).toEqual(expect.anything());
    });
    
    
    test('drop collection if exists', async () => {
        nmi.mongodb.collection(testCollection).drop();
    });
    
    
    let answer;
    test('save dict', async() => {
        answer = await nmi.saveDict({
            collection: "thing",
            dict: {...data, madeBy:"async"},
        });
        log.info("answer:", answer);
    });
    
    
    test('load created document', async () => {
        const savedId = answer.savedDoc._id;
        const fetchedDocs = await nmi.findDict({
            collection: "thing",
            query: {},
        })
        
        const fetchedDoc = await nmi.findOneDict({
            collection: "thing",
            query: {
                _id: savedId
            }
        });
        
        expect(fetchedDoc).toEqual( expect.objectContaining(data));
    });
    
    test('close connection', async () => {
        await nmi.release_connection();
        await nmi.close_connections();
    });
})

if (false) {
    const STRAIGHT_PROMISES=false;
    
    if (STRAIGHT_PROMISES) {
        var novemMongoPromise = NovemMongo.get_instance({dbname:'test'})
        
        novemMongoPromise.then((nmi) => {
            log.info('data: %O', data);
            return nmi.saveDict({
                collection: "thing",
                dict: data,
            }).then((answer)=> {
                nmi.close();
            });
        });
    }
    else
    {
        (async function() {
            
            const nmi = await new NovemMongo({dbname:'test'}).initiate();
            const answer = await nmi.saveDict({
                collection: "thing",
                dict: {...data, madeBy:"async"},
            });
            console.log("answer:", answer);
            const savedId = answer.savedDoc._id;
            const fetchedDocs = await nmi.findDict({
                collection: "thing",
                query: {},
            })
            console.log("fetchedDocs", fetchedDocs);
            
            log.info("id", savedId);
            const fetchedDoc = await nmi.findOneDict({
                collection: "thing",
                query: {
                    _id: savedId
                }
            })
            log.info('fetchedDoc', fetchedDoc);
            nmi.close();
        })();
    }
}