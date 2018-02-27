function what_type(val)
{
    if (val.constructor === String)
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


let a = 45;
