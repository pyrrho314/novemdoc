#!/usr/bin/env node

"use strict";

const NovemDoc = require("../novemdoc").NovemDoc;
const options = require('minimist')(process.argv.slice(2));
const NDMarkdown = require('./md2json').NDMarkdown;

// this guy will manage the json md used to generate the documents
// relying on novemdoc and complexdoc to do the actual composition
// with the json source documents
var fs = require('fs');

for (var fname of options._)
{
    var jmd = new NDMarkdown();
    jmd.compileFile(fname).then( (dict) => 
    {
        console.log("SOURCE:\n", jmd.jd);
        console.log("RESULT",fname, "\n", JSON.stringify(dict, null, 2));
    });
    /*
    var nd = new NovemDoc({
                            doctype: "test_doc",
                            dict: tehdict
                          });
    
    console.log("dt18:", nd.json(true));
    */
}