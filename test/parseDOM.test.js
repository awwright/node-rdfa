'use strict';

var assert = require('assert');

var rdfa = require('./../');
var DOMParser = require('xmldom').DOMParser;

describe('parseDOM', function(){
	it('function', function(){
		assert.equal(typeof rdfa.parseDOM, 'function');
	});
	it('parses', function(){
		var document = new DOMParser().parseFromString('<h></h>', 'text/xml');
		var result = rdfa.parseDOM(rdfa.RDFaXMLParser, 'http://example.com/', document, {});
	})
});
