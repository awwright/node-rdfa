
var files = process.argv.slice(2);

var parse = require('./../index.js').parse;

var fs = require('fs');
var DOMParser = require('xmldom').DOMParser;

var baseURI = 'http://example.com/';

require('./../index.js').console = {
	error: console.error,
	log: console.error,
}

files.forEach(function(filepath){
	try {
		//console.error(filepath);
		var inputContents = fs.readFileSync(filepath, 'UTF-8');
		var document = new DOMParser().parseFromString(inputContents, 'text/xml');
		var result = parse(baseURI, document);
		console.log(result.outputGraph.toArray().map(function(t){ return t.toString()+'\n'; }).join(''));
	}catch(err){
		console.error(err.stack);
	}
});
