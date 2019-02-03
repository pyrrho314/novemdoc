const packageLogger = require('../pkgLogger');

const log = packageLogger.subLogger('dLTest');

console.log('\nManually Called');
log.info("this is info");
log.load('loading/loaded unloading/unloaded');
log.op('performing operation');
log.init('in a constructor');
log.query('submitting query');
log.answer('got answer to query');
log.debug('debugging information');
log.detail('detailed information');
log.warn('serious thing');
log.error('oh this is bad');

console.log('\nCalled As Member')
log.logChannels.forEach((chanObj) => {
    const {channel} = chanObj;
    log[channel](JSON.stringify(chanObj));
});

console.log('\nCalled via log(channel, ...)');
log.logChannels.forEach((chanObj) => {
    const {channel} = chanObj;
    log.log(channel, JSON.stringify(chanObj));
});