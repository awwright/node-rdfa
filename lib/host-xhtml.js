"use strict";

var IRI = require('iri');

var core = require('./core.js');
var RDFaParser = core.RDFaParser;
var context = require('./context.js');

module.exports.RDFaXHTMLParser = RDFaXHTMLParser;
core.inherits(RDFaXHTMLParser, RDFaParser);
function RDFaXHTMLParser(){
	RDFaParser.apply(this, arguments);
	// 1. The default vocabulary URI is undefined.
	this.initialVocabulary = null;
	// 2. HTML+RDFa uses an additional initial context by default
	this.importContext(context['http://www.w3.org/2011/rdfa-context/rdfa-1.1']);
	this.importContext(context['http://www.w3.org/2011/rdfa-context/xhtml-rdfa-1.1']);
	// 3. The base can be set using the base element.
	// This is performed in parse()
	// 4. The current language can be set using either the @lang or @xml:lang attributes. @xml:lang attribute takes precedence.
	// 5. When determining which set of RDFa processing rules to use for documents served with the application/xhtml+xml media type, a conforming RDFa processor must look at the value in the DOCTYPE declaration of the document.
}

RDFaXHTMLParser.computeBase = function computeBase(base, document){
	// Visit each element recursively
	var node = document.documentElement.firstChild;
	while(node && (node.namespaceURI!='http://www.w3.org/1999/xhtml' || node.nodeName!='head')) node=node.nextSibling;
	node = node.firstChild;
	do {
		if(node.namespaceURI=='http://www.w3.org/1999/xhtml' && node.nodeName=='base'){
			return new IRI.IRI(base).resolveReference(node.getAttribute('href')).defrag().toString();
		}
		node = node.nextSibling;
	} while (node);
	return base;
}

RDFaXHTMLParser.parse = parse;
function parse(base, document, options){
	if(typeof base!=='string') throw new Error('Expected `base` to be a string');
	if(typeof document!=='object') throw new Error('Unexpected argument');
	if(typeof options==='object'){
	}
	// @@@TODO Test conformance here
	// See https://www.w3.org/TR/xhtml-rdfa/ section 2.1. Document Conformance
	var parser = new RDFaXHTMLParser(base, document.documentElement);
	var node = document;
	if(typeof options==='object'){
		if(options.rdfenv) parser.rdfenv = options.rdfenv;
	}
	parser.base = RDFaXHTMLParser.computeBase(parser.base, document);
	parser.setNewSubject = function(node){
		return (
			node.parentNode==parser.documentElement
			&& node.namespaceURI=='http://www.w3.org/1999/xhtml'
			&& (node.tagName=='head' || node.tagName=='body')
		);
	};
	parser.walkDocument(document);
	return {
		document: document,
		parser: parser,
		outputGraph: parser.outputGraph,
		processorGraph: parser.processorGraph,
	};
}
