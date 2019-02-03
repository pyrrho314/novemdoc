console.log("import novemdoc/index.js")
exports.novemdoc_module = require("./novemdoc");
exports.novemdoc_config_module = require('./config');
exports.NovemDoc = exports.novemdoc_module.NovemDoc;
exports.ndocConfig = exports.novemdoc_config_module;
if (typeof window === 'undefined') {
    exports.NovemMongo = eval('require')("./novem_db/novemmongo").NovemMongo;
} else {
    // windows only
}

//exports.complexdoc_module = require("./complexdoc");
//exports.ComplexDoc = exports.complexdoc_module.ComplexDoc;

