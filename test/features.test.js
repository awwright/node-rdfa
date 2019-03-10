'use strict';

var util = require('util');
var fs = require('fs');
var assert = require('assert');

var rdfa = require('..');
var DOMParser = require('xmldom').DOMParser;

// Several parsers implement the additional rules for vocabularies like HTML, etc.
// Verify they are subclasses of RDFaParser.
describe('warning reporting', function(){
	it('predicate in @property', function(){
		var documentString = '<root about="http://example.com" property="_:foo" content="bar" />';
		var document = new DOMParser().parseFromString(documentString, 'text/xml');
		var result = rdfa.parseDOM(rdfa.RDFaXMLParser, 'http://example.com/', document, {});
		assert.equal(result.outputGraph.length, 0);
		assert(result.processorGraph.length);
	});
});
