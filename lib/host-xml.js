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
