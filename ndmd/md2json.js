'use strict';
const _ = require('lodash');
var fs = require('fs');
const nestingmonitor = require('./nestingmonitor');
var NestingMonitor = nestingmonitor.NestingMonitor;
var NovemDoc = require('../novemdoc').NovemDoc;
var nestmon = nestingmonitor.nestmon;
let parseline = require('./parseline')
let ParseLine = parseline.ParseLine;
let what_type = parseline.what_type;
const DEBUG = true;
const NEST_DBG  = true;
const NEST_DBg2 = true;

class NDMarkdown
{
    JSONmd() {
        this.jd = null;
    }
    compileFile(fname) {
        var self = this;
        return new Promise( function(resolve,reject)
        {
            fs.readFile(fname, 'utf8', function (err, idata)
            {
                if (err)
                {
                    console.log('jmd90: error', err);
                    reject(err);
                    return;
                }
                // break document into lines
                var doc = idata.toString().trim();
                self.jd = doc;
                var lines = doc.split('\n');

                // setup for line by line parsing
                var rootobj = {};
                var objstack = [rootobj,];
                var levnum = 0;
                var last_val = null;
                
                // line by line iteration
                let i = 0;
                lines.forEach(function (line, index)
                {
                    nestmon.processLine(line)
                });
                //console.log(`RESULT:\n ${JSON.stringify(retobj, null, 2)}`);
                let result = new NovemDoc();
                for (let li in nestmon.parsed_lines)
                {
                    let line = nestmon.parsed_lines[li];
                    //console.log("md55:", line);
                    if (_.isPlainObject(line.val) && _.isEmpty(line.val))
                    {
                        console.log('md57:', line.dotroot, line.head);
                        result.set(line.dotroot, line.head);
                    } else
                    {
                        console.log("md53:",line.dotpath, line.val);
                        result.set(line.dotpath, line.val);
                    }
                }
                resolve(result.dict);
            });
        });
    }
}


/*
if (false)
{
    var jmd = new JSONmd();

    jmd.compileFile('./cmdparts/offers.dmd').then( (dict) =>
        {
        console.log('RESULT', JSON.stringify(dict, null, 2));
    });
}
*/
module.exports = {
    NDMarkdown: NDMarkdown,
};
