
function what_type(val)
{
    if (!val) 
    {
        return null;
    }
    else if (val.constructor === String)
    {
        return 'string';
    }
    else if (val.constructor === Array)
    {
        return 'list';
    }
    else if (val.constructor === Number)
    {
        return 'number';
    }
    else if (val.constructor === Object)
    {
        return 'dict';
    }
    return null;
}

class ParseLine
{
    constructor(line)
    {
        this.line = line;
        this.head = null;
        this.val = null;
        this.valtype = null;
        this.indent = "";
        this.indentlen = 0;
        this.parse_line(line);
        
        this.path_count = 0;
    }

    parse_line(line)
    {
        // nop null lines
        if (!line) return null;

        // separate indent from statement
        var match =  line.match(/(\s*)(.*)/);
        if (!match) return;
        var [ full, indent, statement, ] = match;

        // separate statment head from value
        var [head, val,] = statement.split(':');
        // trim the head b/c has indent in it plus
        head = head.trim();
        val = val ? val.trim():null;
        if (!val)
        {
            if (head.endsWith('[]'))
            {
                val = [];
                // remove [] postfix
                head = head.slice(0, head.length-2);
            }
            else
            {
                val = {};
            }

        }
        this.valtype = what_type(val);
        this.head = head;
        this.val = val;
        this.indent = indent;
        this.indentlen = this.indent.length;
    }
    
    path_elem() {
        let cur_path_count = this.path_count;
        this.path_count++
        
        if (this.valtype === 'list') {
            return `${this.head}[${cur_path_count}]`;
        } else {
            return this.head;
        }
    }
}

module.exports = {
    ParseLine: ParseLine,
    what_type: what_type
};