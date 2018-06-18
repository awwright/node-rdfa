"use strict";

var core = require('./core.js');
var RDFaParser = core.RDFaParser;
var context = require('./context.js');

module.exports.RDFaXMLParser = RDFaXMLParser;
core.inherits(RDFaXMLParser, RDFaParser);
function RDFaXMLParser(){
	RDFaParser.apply(this, arguments);
	this.initialVocabulary = null;
	this.importContext(context['http://www.w3.org/2011/rdfa-context/rdfa-1.1']);
}

RDFaXMLParser.parse = parse;
function parse(base, document, options){
	if(typeof base!=='string') throw new Error('Expected `base` to be a string');
	if(typeof document!=='object') throw new Error('Unexpected argument');
	if(typeof options==='object'){
	}
	var parser = new RDFaXMLParser(base, document.documentElement);
	var node = document;
	if(typeof options==='object'){
		if(options.rdfenv) parser.rdfenv = options.rdfenv;
	}
	parser.walkDocument(document);
	return {
		document: document,
		parser: parser,
		outputGraph: parser.outputGraph,
		processorGraph: parser.processorGraph,
	};
}
