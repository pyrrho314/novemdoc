const DEBUG = true;
const SILLY = false;
const NEST_DBG  = false;
const NEST_DBG2 = false;

const _ = require('lodash');
const parseline = require('./parseline');
const ParseLine = parseline.ParseLine;
class NestingMonitor 
{
    constructor()
    {
        this.parsed_lines = [];
        this.level = 0;
        this.indent_stack = [];
        this.curtarget = {};
    }

    addParsedLine(parsed)
    {
        this.parsed_lines.push(parsed);
    }
    
    numParsedLines()
    {
        return this.parsed_lines.length;
    }
    
    lastParsedLine()
    {
        return this.parsed_lines[this.parsed_lines.length-1];
    }
    
    compareParsedLines(new_pline, old_pline)
    {
        /*return -1 if new < old, +1 if new > old, and 0 if ==*/
        //console.log(`nm34: old_pline: ${JSON.stringify(old_pline)}\nnew_pline: ${JSON.stringify(new_pline, null, 2)}`);
        function _innercompare(old_pline, new_pline) 
        {
            if (!old_pline) return 1
                else if (!new_pline) return 0; 
                else if (new_pline.indentlen < old_pline.indentlen) return -1;
                else if (new_pline.indentlen > old_pline.indentlen) return +1;
                else if (new_pline.indent == old_pline.indent) return 0;
                else throw Error("same length indents, not same string, that's not right.", new_pline, old_pline);
        }
        let compareval = _innercompare(old_pline, new_pline);
        if (SILLY) console.log(`compare '${old_pline? old_pline.line: 'null'}'' to '${new_pline.line}' = ${compareval}`);
        return compareval;
    }
    processLine(line, opts)
    {
        if (!opts ) opts = {};
        var parsed = new ParseLine(line);
        
        // THIS IS A THING (you can do add the new line right away, or wait... this is right away)
        var last_pline = this.lastParsedLine();
        this.addParsedLine(parsed);
        // END OF THING
        
        //console.log("last_pline", last_pline);
        const new_pline = parsed;
        const levelchange = this.compareParsedLines(new_pline, last_pline);
        this.level += levelchange;
        if (SILLY) 
        {
            console.log(
`nm61: line: |${line}|
     : ${parsed.head}=${parsed.val} <${parsed.valtype}>
     : indent |${parsed.indent}| (${parsed.indentlen})
     : level = ${this.level} (change:${levelchange})
`);
        }
        
        switch (levelchange)
        {
            case 0:
                // same level callback
                if (NEST_DBG) console.log(`(same level)`);
                // call same level callback
                opts.same && opts.same(parsed);
                break;
            case +1:
                if (NEST_DBG) console.log('nm75: indenting in');
                if (last_pline)
                {
                    if (false) //(last_pline.valtype != 'dict')
                    {
                        throw Error(`bad parent types ${last_pline.valtype}`);
                    }
                    this.indent_stack.push(last_pline);
                    opts.in && opts.in(parsed);
                }
                break;
            case -1:
                // out-dent callback
                if (NEST_DBG) console.log('nm81: indenting out');
                this.indent_stack.pop();
                opts.out && opts.out(parsed);
                break;
        }
        let dpelems = _.map(this.indent_stack, (elem, index, ary) => { return elem.path_elem(index, ary); });
        dpelems.push(parsed.head);
        
        let dotpath = dpelems.join('.');
        let dotroot = dpelems.slice(0,dpelems.length-1).join('.');
        parsed.dotroot = dotroot;
        parsed.dotpath = dotpath;
        
        if (DEBUG) console.log(`dotroot: ${parsed.dotroot} = ${JSON.stringify(parsed.head)}`);
        if (DEBUG) console.log(`dotpath: ${parsed.dotpath} = ${JSON.stringify(parsed.val)}`);
        if (opts.all) opts.all(parsed);        
        
    }
    
}

var nestmon = new NestingMonitor();

module.exports = { NestingMonitor: NestingMonitor,
                    nestmon: nestmon
};