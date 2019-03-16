"use strict";

var IRI = require('iri');

var core = require('./core.js');
var RDFaParser = core.RDFaParser;
var context = require('./context.js');

module.exports.RDFaHTMLParser = RDFaHTMLParser;
core.inherits(RDFaHTMLParser, RDFaParser);
function RDFaHTMLParser(){
	RDFaParser.apply(this, arguments);
	// 1. The default vocabulary URI is undefined.
	this.initialVocabulary = null;
	// 2. HTML+RDFa uses an additional initial context by default
	this.importContext(context['http://www.w3.org/2011/rdfa-context/rdfa-1.1']);
	this.importContext(context['http://www.w3.org/2011/rdfa-context/html-rdfa-1.1']);
}

RDFaHTMLParser.prototype.scanDocument = function scanDocument(document){
	this.base = RDFaHTMLParser.computeBase(this.base, document);
}

RDFaHTMLParser.computeBase = function computeBase(base, document){
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
