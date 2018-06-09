# RDFa 

A fairly compact, cross-platform, extensible module to extract RDF information from RDFa-enabled documents.

Features:

* Sometimes extracts RDF statements
* Passes more than half of many sections of the RDFa test suite

Goals:

* Consume DOM nodes or SAX events
* Output a complete graph or "Statement" events
* Support custom types of nodes (e.g. variables)
* Query for DOM nodes by data they contain

## File index

* bin/httpd.js - an HTTP server for use with the RDFa Test Suite
* bin/rdfa-turtle.js - read a file and print extracted triples
* defaults.json - list of RDFa Initial Context vocabulary & terms
* index.js - the bulk of the logic
* test/suite.js - runs the library against a local copy of the RDFa test suite

## API

### parse(base, document)

Extracts RDF statements out of a DOM document `document`, assuming a URI base `base` (always ignoring the URI in the DOM node, if any).

Returns an object with the properties:

* parser - instance of the RDFaParser instance that was created
* outputGraph - instance of [RDF.Graph](https://github.com/awwright/node-rdf#graph)
* processorGraph - instance of [RDF.Graph](https://github.com/awwright/node-rdf#graph)

### RDFaParser

Maintains state during processing of a document. Created by `parse`

### RDFaContext

Represents an RDFa processing context that's generated during processing of an element and passed to child elements.

