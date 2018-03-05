const { DogLogger } = require('./doglogger/doglogger');
const packageLogger = new DogLogger('ndoc'); 

module.exports = packageLogger;