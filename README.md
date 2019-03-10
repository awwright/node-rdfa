
# ECMAScript RDFa Parser

A fairly modular, cross-platform, extensible package to extract RDF information from RDFa-enabled documents.

Features:

* Sometimes extracts RDF statements
* Passes all compliant XML tests
* Walks DOM tree to generate an RDF graph
* Extensible design for parsing supersets of RDFa and supporting new media types

Goals:

* Consume DOM nodes or SAX events
* Output a complete graph or "Statement" events
* Support custom types of nodes (e.g. variables)
* Query for DOM nodes by data they contain
* Linting of RDFa documents for:
	* check property order
	* reverse/forward incompatability
	* shadowed definitions
	* defining over registered URI schemes
	* non-normalized IRI references
	* Invalid IRIs
	* Invalid CURIEs
	* Term is used without an active vocabulary

## Features

### Parse a DOM tree into an RDF graph

```javascript
const rdfa = require('rdfa');
const fs = require('fs');
const DOMParser = require('xmldom').DOMParser;

const filepath = './test/rdfa.github.io/test-suite/test-cases/rdfa1.1-lite/xhtml1/0021.xhtml';
const document = new DOMParser().parseFromString(fs.readFileSync(filepath, 'UTF-8'), 'text/xml');
const result = rdfa.parseDOM(rdfa.RDFaXMLParser, 'http://example.com/', document);
result.outputGraph.forEach(function(n){ console.log(n.toTurtle()); });
```

	<http://example.com/> <http://purl.org/dc/elements/1.1/creator> "Mark Birbeck" .


### Support for standards-based XML parsers

There is no included document parser, instead supports reading from a DOM (W3C or compatible), or a SAX-like event stream.

Tests are written for the following packages:

* http://npmjs.com/package/xmldom


### Support for different media types

Supports plain XML, HTML, and SVG out-of-the-box, and is extendible for new host languages.

Supported host languages:

* RDFaXMLParser - for plain XML documents
* RDFaXHTMLParser - for HTML documents delivered in `application/xhtml+xml`
* RDFaHTMLParser - for HTML documents delivered in `text/html`


## File index

* bin/httpd.js - an HTTP server for use with the RDFa Test Suite
* bin/rdfa-turtle.js - read a file and print extracted triples
* defaults.json - list of RDFa Initial Context vocabulary & terms
* index.js - the bulk of the logic
* test/suite.js - runs the library against a local copy of the RDFa test suite


## API

### parseDOM(Processor, base, document, options)

Extracts RDF statements out of a DOM document `document`, assuming a URI base `base` (always ignoring the URI in the DOM node, if any).

Returns an RDFaParser instance (see below).

* Processor: a reference to a subclass of RDFaParser
* base: the URI base for the document (where the document was downloaded from)
* document: DOM document
* options: object with additional configuration
	* forceVersion: RDFa version to use. This is normally detected.
	* defaultLanguage: default language for when no language is specified by the document (use the language specified in the `Content-Language` header, if any)


### RDFaParser

* outputGraph - instance of [RDF.Graph](https://github.com/awwright/node-rdf#graph)
* processorGraph - instance of [RDF.Graph](https://github.com/awwright/node-rdf#graph)

Maintains state during processing of a document. Pass a subclass of this to `parseDOM` as the first argument `Processor`.


### RDFaXMLParser

RDFaParser with the default RDF context loaded.


### RDFaXHTMLParser

RDFaParser extended with the parsing rules for `application/xhtml+xml` documents.


### RDFaHTMLParser

RDFaParser extended with the parsing rules for `text/html` documents.


### RDFaContext

Represents an RDFa processing context that's generated during processing of an element and passed to child elements.
