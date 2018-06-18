
var core = require('./core.js');
var RDFaParser = core.RDFaParser;

core.inherits(XMLRDFaParser, RDFaParser);
function XMLRDFaParser(){
	RDFaParser.call(this);
	this.stack[0].vocabulary = null;
	this.importContext('http://www.w3.org/2011/rdfa-context/rdfa-1.1');
}
