const config = require('../config');

console.log("config:", config);
config.set('newarg', 45);
console.log("config:", config);
