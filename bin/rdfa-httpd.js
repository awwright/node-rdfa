// This is a simple, minimal server to run against the RDFa Test Suite <http://rdfa.info/test-suite/>
// Downloads an RDFa document and returns a list of triples from that document.
// Use <http://localhost:8080/?uri=>

var parse = require('../index.js').RDFaXMLParser.parse;
var fs = require('fs');
var path = require('path');
var http = require('http');
var get = require('http').get;
var DOMParser = require('xmldom').DOMParser;

var listenPort = 8080;

var httpd = http.createServer(handleRequest);
httpd.listen(listenPort);
console.error('Server listening on 0.0.0.0:'+listenPort);

function handleRequest(req, res){
	console.log(req.method + ' ' + req.url);
	if(req.method=='OPTIONS'){
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.statusCode = 200;
		res.end();
	}
	var uri = req.url.split('uri=')[1];
	res.setHeader('Access-Control-Allow-Origin', '*');
	get(uri, function(dl){
		console.log(dl.statusCode + ' ' + uri);
		res.statusCode = dl.statusCode;
		res.setHeader('Content-Type', 'text/turtle');
		dl.setEncoding('utf8');
		let rawData = '';
		dl.on('error', function(chunk){
			res.statusCode = 500;
			res.write('# error');
			res.end();
		});
		dl.on('data', function(chunk){ rawData += chunk; });
		dl.on('end', function(){ haveData(rawData); });
	});
	function haveData(body){
		try{
			var document = new DOMParser().parseFromString(inputContents, 'text/xml');
			var parsed = parse(uri, document);
			var graph = parsed.outputGraph.toArray();
		}catch(e){
			res.write('# Fatal error:\n');
			res.write(e.stack.replace(/^/gm, '# '));
			res.write('\n\n');
			res.end();
			return;
		}
		for (var i = 0; i < graph.length; i++) {
			console.log(graph[i].toString());
		}
		res.write('# <'+uri+'>\n');
		//for(var i=0; i<req.rawHeaders.length; i+=2) res.write('# '+req.rawHeaders[i]+': '+req.rawHeaders[i+1]+' \n');
		//res.write(body.replace(/^/gm, '# '));
		res.write('\n');
		console.log('Triples:');
		for (var i = 0; i < graph.length; i++) {
			res.write(graph[i].toString()+'\n');
			console.log(graph[i].toString());
		}
		res.end();
	}
}
