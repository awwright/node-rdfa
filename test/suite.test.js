'use strict';

var util = require('util');
var fs = require('fs');
var assert = require('assert');

var rdfenv = require('rdf').environment;
var DOMParser = require('xmldom').DOMParser;
var TurtleParser = require('rdf').TurtleParser;

/**
 * Runs the JSON Schema Test Suite
 */

var manifestPath = __dirname + '/rdfa.github.io/test-suite/manifest.jsonld';

var parseDOM = require('./../').parseDOM;
var RDFaXMLParser = require('./../').RDFaXMLParser;
var RDFaXHTMLParser = require('./../').RDFaXHTMLParser;
var RDFaHTMLParser = require('./../').RDFaHTMLParser;

var fs = require('fs');
var manifestJSON = fs.readFileSync(manifestPath);
var manifest = JSON.parse(manifestJSON);
var cases = manifest['@graph'];

var suffixMap = {
	xhtml1: "xhtml",
	xhtml5: "xhtml",
	html4: "html",
	html5: "html",
	svg: "svg",
	xml: "xml",
};
var parserMap = {
	xhtml1: RDFaXHTMLParser,
	xhtml5: RDFaXHTMLParser,
	html4: RDFaHTMLParser,
	html5: RDFaHTMLParser,
	svg: RDFaXMLParser,
	xml: RDFaXMLParser,
};
var TCPATH = 'http://rdfa.info/test-suite/test-cases/';

var skipTests = [
	'0238', // test is on processor graph, needs SPARQL parser
	'0239', // test is on processor graph, needs SPARQL parser
	'0240', // Expects entailment
	'0241', // Expects entailment
	'0242', // Expects entailment
	'0295', // Ignore the benchmark test for now
	'0304', // Embedded RDFXML isn't RDFa, maybe later test if we can hand over elements to an RDFXML parser
	'0305', // Role attribute will be supported later
	'0307', // Role attribute will be supported later
];

describe('rdfa.info Test Suite', function(){
	describe('rdfa1.1-lite/xml', function(){ generateCasesTtl('rdfa1.1-lite', 'xml'); });
	// describe('rdfa1.0/xml', function(){ generateCasesTtl('rdfa1.0', 'xml'); });
	describe('rdfa1.1/xml', function(){ generateCasesTtl('rdfa1.1', 'xml'); });
	// describe('rdfa1.1/svg', function(){ generateCasesTtl('rdfa1.1', 'svg'); });
	// describe('rdfa1.1/xhtml1', function(){ generateCasesTtl('rdfa1.1', 'xhtml1'); });
	// describe('rdfa1.1/xhtml5', function(){ generateCasesTtl('rdfa1.1', 'xhtml5'); });
});

function generateCasesTtl(version, lang){
	var suffix = suffixMap[lang];
	var Parser = parserMap[lang];
	cases
		.filter(function(v){ return v.expectedResults && v.hostLanguages.indexOf(lang)>=0 && v.versions.indexOf(version)>=0; })
		.forEach(function(test){
		it(test.num+' '+test.description, function(){
			if(skipTests.indexOf(test.num)>=0) return void this.skip();
			if(skipTests.indexOf(version+'/'+lang+'/'+test.num)>=0) return void this.skip();
			var queryFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.ttl';
			var queryContents = fs.readFileSync(queryFilename, 'UTF-8');
			var inputFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.'+suffix;
			var inputContents = fs.readFileSync(inputFilename, 'UTF-8');
			var inputURI = TCPATH+''+version+'/'+lang+'/'+test.num+'.'+suffix;
			var params = test.queryParam;

			var document = new DOMParser().parseFromString(inputContents, 'text/xml');
			var result = parseDOM(Parser, inputURI, document, {rdfenv:rdfenv});
			var outputGraph = result.outputGraph;
			if(params==='rdfagraph=processor'){
				outputGraph = result.processorGraph;
			}

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
