'use strict';

var util = require('util');
var fs = require('fs');
var assert = require('assert');

var st = require('rdfstore');
var DOMParser = require('xmldom').DOMParser;
var TurtleParser = require('rdf').TurtleParser;
var rdfenv = require('rdf').environment;

/**
 * Runs the JSON Schema Test Suite
 */

var manifestPath = __dirname + '/rdfa.github.io/test-suite/manifest.jsonld';

var parse = require('./../index.js').parse;

var fs = require('fs');
var manifestJSON = fs.readFileSync(manifestPath);
var manifest = JSON.parse(manifestJSON);
var cases = manifest['@graph'];

describe('rdfa.info Test Suite', function(){
	//describe('rdfa1.1-lite/xml', function(){ generateCases('rdfa1.1', 'xml'); });
	//describe('rdfa1.1/xml', function(){ generateCases('rdfa1.1', 'xml'); });
	//describe('rdfa1.1-lite/xhtml5', function(){ generateCases('rdfa1.1-lite', 'xhtml5'); });
	//describe('rdfa1.1/xhtml5', function(){ generateCases('rdfa1.1', 'xhtml5'); });

	//describe('rdfa1.1-lite/xml', function(){ generateCasesTtl('rdfa1.1', 'xml'); });
	describe('rdfa1.1/xml', function(){ generateCasesTtl('rdfa1.1', 'xml'); });
	//describe('rdfa1.1-lite/xhtml5', function(){ generateCasesTtl('rdfa1.1-lite', 'xhtml5'); });
	//describe('rdfa1.1/xhtml5', function(){ generateCasesTtl('rdfa1.1', 'xhtml5'); });
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

function generateCases(version, lang){
	cases
		.filter(function(v){ return v.expectedResults && v.hostLanguages.indexOf(lang)>=0 && v.versions.indexOf(version)>=0; })
		.forEach(function(test){
		it(test.num+' '+test.description, function(done){
			var queryFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.sparql';
			var queryContents = fs.readFileSync(queryFilename, 'UTF-8')
				.replace(/\$TCPATH/g, TCPATH)
				.replace(/_:/g, '?_') // change bnodes to variables to work around bug
				.replace(/isBlank/g, 'ISBLANK'); // uppercase functions to workaround bug
			var inputFilename = __dirname+'/rdfa.github.io/test-suite/test-cases/'+version+'/'+lang+'/'+test.num+'.'+suffixMap[lang];
			var inputContents = fs.readFileSync(inputFilename, 'UTF-8');
			var inputURI = TCPATH+''+version+'/'+lang+'/'+test.num+'.'+suffixMap[lang];

			var document = new DOMParser().parseFromString(inputContents, 'text/xml');
			var result = parse(inputURI, document);
			var ttl = result.outputGraph.toArray().map(function(t){ return t.toString()+'\n'; }).join('\n');

			//console.log(ttl);
			//console.log(queryContents);

			st.create(function(err, store){
				if(err) throw err;
				store.load('text/turtle', ttl, function(err, res){
					if(err) throw err;
					store.execute(queryContents, function(err, results){
						if(err) throw err;
						assert.ok(results, queryContents);
						done();
					});
				});
			});
		});
	});
}

function generateCasesTtl(version, lang){
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
			var result = parse(inputURI, document);
			var ttl = result.outputGraph.toArray().map(function(t){ return t.toString()+'\n'; }).join('\n');

			var turtleParser = TurtleParser.parse(queryContents, inputURI);
			var expectedGraph = turtleParser.graph;
			//console.log("expectedGraph:\n"+expectedGraph.toArray().join("\n"));
			//console.log("result:\n"+result.outputGraph.toArray().join("\n"));
			//assert.equal(rdfnormalize(expectedGraph), rdfnormalize(result.outputGraph), 'Graphs have same contents');
			assert.equal(expectedGraph.length, result.outputGraph.length, 'Graphs must be same size');
			var match = expectedGraph.equals(result.outputGraph);
			//console.log(match);
			if(!match){
				assert.equal(result.outputGraph.toArray().sort().join("\n"), expectedGraph.toArray().sort().join("\n"));
				assert(match, 'Graphs are equal');
			}
		});
	});
}
