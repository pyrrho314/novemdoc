const { DogLogger } = require('./doglogger/');
const packageLogger = new DogLogger('ndoc'); 

module.exports = packageLogger;