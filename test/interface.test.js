'use strict';

var util = require('util');
var fs = require('fs');
var assert = require('assert');

var rdfa = require('..');

// Several parsers implement the additional rules for vocabularies like HTML, etc.
// Verify they are subclasses of RDFaParser.
describe('builtin parsers', function(){
	it('RDFaXMLParser', function(){
		assert(rdfa.RDFaXMLParser.prototype instanceof rdfa.RDFaParser);
	});
	it('RDFaXHTMLParser', function(){
		assert(rdfa.RDFaXHTMLParser.prototype instanceof rdfa.RDFaParser);
	});
	it('RDFaHTMLParser', function(){
		assert(rdfa.RDFaHTMLParser.prototype instanceof rdfa.RDFaParser);
	});
});
