'use strict';

var util = require('util');
var fs = require('fs');
var assert = require('assert');

//var st = require('rdfstore');
var DOMParser = require('xmldom').DOMParser;
var TurtleParser = require('rdf').TurtleParser;
var rdfenv = require('rdf').environment;

/**
 * Runs the JSON Schema Test Suite
 */

var manifestPath = __dirname + '/rdfa.github.io/test-suite/manifest.jsonld';

var parse = require('./../index.js').parse;
var RDFaXMLParser = require('./../index.js').RDFaXMLParser;
var RDFaXHTMLParser = require('./../index.js').RDFaXHTMLParser;

var fs = require('fs');
var manifestJSON = fs.readFileSync(manifestPath);
var manifest = JSON.parse(manifestJSON);
var cases = manifest['@graph'];

describe('rdfa.info Test Suite', function(){
	describe('rdfa1.1/xml', function(){ generateCasesTtl('rdfa1.1', 'xml', RDFaXMLParser); });
	describe('rdfa1.1/xhtml1', function(){ generateCasesTtl('rdfa1.1', 'xhtml1', RDFaXHTMLParser); });
	describe('rdfa1.1/xhtml5', function(){ generateCasesTtl('rdfa1.1', 'xhtml5', RDFaXHTMLParser); });
});

var suffixMap = {
	xhtml1: "xhtml",
	xhtml5: "xhtml",
	html4: "html",
	html5: "html",
	svg: "svg",
	xml: "xml",
};

var TCPATH = 'http://rdfa.info/test-suite/test-cases/';

function generateCasesTtl(version, lang, Parser){
	cases
		.filter(function(v){ return v.expectedResults && v.hostLanguages.indexOf(lang)>=0 && v.versions.indexOf(version)>=0; })
		.forEach(function(test){
		it(test.num+' '+test.description, function(){
			var queryFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.ttl';
			var queryContents = fs.readFileSync(queryFilename, 'UTF-8');
			var inputFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.'+suffixMap[lang];
			var inputContents = fs.readFileSync(inputFilename, 'UTF-8');
			var inputURI = TCPATH+''+version+'/'+lang+'/'+test.num+'.'+suffixMap[lang];

			var document = new DOMParser().parseFromString(inputContents, 'text/xml');
			var result = Parser.parse(inputURI, document);
			var outputGraph = result.outputGraph;

			var turtleParser = TurtleParser.parse(queryContents, inputURI);
			var expectedGraph = turtleParser.graph;
			//console.log("expectedGraph:\n"+expectedGraph.toArray().join("\n"));
			//console.log("result:\n"+result.outputGraph.toArray().join("\n"));
			//assert.equal(rdfnormalize(expectedGraph), rdfnormalize(result.outputGraph), 'Graphs have same contents');
			var match = expectedGraph.equals(result.outputGraph);
			//console.log(match);
			if(!match){
				assert.equal(
					outputGraph.toArray().map(function(v){ return v.toString(); }).sort().join("\n"),
					expectedGraph.toArray().map(function(v){ return v.toString(); }).sort().join("\n")
				);
				assert(match, 'Graphs are equal');
			}
		});
	});
}
