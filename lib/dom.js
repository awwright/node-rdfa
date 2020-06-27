"use strict";

var RDFaParser = require('./core.js').RDFaParser;

exports.parseDOM = parseDOM;
function parseDOM(Parser, base, document, options){
	if(!(Parser.prototype instanceof RDFaParser)) throw new Error('Expected arguments[0] `Parser` to be instance of RDFaParser');
	if(typeof base!=='string') throw new Error('Expected `base` to be a string');
	if(typeof document!=='object') throw new Error('Unexpected argument');
	var parser = new Parser(base, document.documentElement, options.rdfenv);
	if(typeof options==='object'){
		if(options.rdfenv) parser.rdfenv = options.rdfenv;
	}
	parser.scanDocument(document);
	parser.walkDocument(document);
	return parser;
}
