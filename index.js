
exports.tokenize = require('./lib/core.js').tokenize;
exports.inherits = require('./lib/core.js').inherits;
exports.RDFaContext = require('./lib/core.js').RDFaContext;
exports.parseDOM = require('./lib/dom.js').parseDOM;

exports.RDFaParser = require('./lib/core.js').RDFaParser;
exports.RDFaCoreParser = require('./lib/core.js').RDFaCoreParser;
exports.RDFaXMLParser = require('./lib/host-xml.js').RDFaXMLParser;
exports.RDFaHTMLParser = require('./lib/host-html.js').RDFaHTMLParser;
exports.RDFaXHTMLParser = require('./lib/host-xhtml.js').RDFaXHTMLParser;
