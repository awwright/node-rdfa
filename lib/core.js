
var rdf = require('rdf');
var IRI = require('iri');
var XMLSerializer = function(xmlNode){
	var s = new (require('xmldom').XMLSerializer);
	return s.serializeToString(xmlNode);
}

var context = require('./context.js');

var rdfaNS = rdf.ns('http://www.w3.org/ns/rdfa#');
var dcNS = rdf.ns('http://purl.org/dc/terms/');

const StringLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const XHTMLNS = "http://www.w3.org/1999/xhtml/vocab#";
const XSDString = "http://www.w3.org/2001/XMLSchema#string";

module.exports.inherits = inherits;
function inherits(ctor, superCtor) {
	//ctor.super_ = superCtor;
	ctor.prototype = Object.create(superCtor.prototype, {
		constructor: { value: ctor, enumerable: false },
	});
};

module.exports.tokenize = tokenize;
function tokenize(s){
	return s.trim().split(/\s+/);
}

module.exports.RDFaContext = RDFaContext;
function RDFaContext(parser, node){
	// Settings
	this.depth = 0;
	this.parser = parser;
	this.base = parser.base;
	this.node = node;
	this.rdfenv = parser.rdfenv;
	this.bm = null; // bnode map
	// RDFa context
	this.parentContext = null;
	this.parentSubject = this.rdfenv.createNamedNode(parser.base);
	this.parentObject = null;
	this.pendingincomplete = [];
	this.listMapping = {};
	this.language = null;
	this.prefixes = {};
	this.prefixesDefault = parser.contextPrefixes;
	this.terms = parser.contextTerms;
	this.vocabulary = null;
	this.query = null;
	// Local variables, set based on local attributes and child elements
	this.skipElement = true;
	this.currentObjectResource = null;
	this.newSubject = null;
	this.localListMapping = {};
	this.incomplete = [];
}
RDFaContext.prototype.child = function child(node){
	var ctx = new this.parser.RDFaContext(this.parser, this.base, node);
	ctx.rdfenv = this.rdfenv;
	ctx.bm = this.bm;
	ctx.parentContext = this;
	ctx.depth = this.depth + 1;
	ctx.base = this.base;
	ctx.prefixesDefault = this.prefixesDefault;
	//ctx.terms = this.terms;
	if(this.skipElement){
		ctx.parentSubject = this.parentSubject;
		ctx.parentObject = this.parentObject;
		ctx.incomplete = this.incomplete;
		ctx.pendingincomplete = this.pendingincomplete;
		ctx.listMapping = this.listMapping;
		ctx.language = this.language;
		ctx.prefixes = {};
		for(var n in this.prefixes) ctx.prefixes[n] = this.prefixes[n];
		ctx.terms = {};
		for(var n in this.terms) ctx.terms[n] = this.terms[n];
		ctx.vocabulary = this.vocabulary;
		ctx.query = this.query;
	}else{
		ctx.parentSubject = this.newSubject || this.parentSubject;
		ctx.parentObject = this.currentObjectResource || this.newSubject || this.parentSubject;
		ctx.prefixes = {};
		for(var n in this.prefixes) ctx.prefixes[n] = this.prefixes[n];
		ctx.pendingincomplete = this.incomplete;
		ctx.listMapping = this.localListMapping;
		ctx.language = this.language;
		ctx.vocabulary = this.vocabulary;
	}
	return ctx;
}
RDFaContext.prototype.onPop = function onPop(){
	var rdfaContext = this;
	var self = rdfaContext.parser;
	for(var prop in rdfaContext.localListMapping){
		// only process lists that were created in the current context
		if(rdfaContext.listMapping[prop]) return;
		var list = rdfaContext.localListMapping[prop];
		if(list.length == 0){
			self.emit(
				rdfaContext.parentSubject,
				prop,
				rdf.rdfns('nil')
			);
		}else{
			var rest = rdfaContext.rdfenv.createBlankNode();
			self.emit(
				rdfaContext.parentSubject,
				prop,
				rest
			);
			rdfaContext.localListMapping[prop].forEach(function(first, i){
				var next = rdfaContext.rdfenv.createBlankNode();
				self.emit(
					rest,
					rdf.rdfns('first'),
					first
				);
				self.emit(
					rest,
					rdf.rdfns('rest'),
					(i==list.length-1) ? rdf.rdfns('nil') : next
				);
				rest = next;
			});
		}
	}
}
RDFaContext.prototype.mapBlankNode = function mapBlankNode(name){
	if(this.bm[name]){
		return this.bm[name];
	}
	var bnode = this.bm[name] = this.rdfenv.createBlankNode();
	bnode.nominalValue += '_'+name.substring(2);
	return bnode;
}
RDFaContext.prototype.resolveReference = function resolveReference(iriref){
	return new IRI.IRI(this.base).resolveReference(iriref).toString();
}
RDFaContext.prototype.fromSafeCURIEorCURIEorIRI = function fromSafeCURIEorCURIEorIRI(str){
	// @about and @resource support the datatype SafeCURIEorCURIEorIRI - allowing a SafeCURIE, a CURIE, or an IRI.
	var ctx = this;
	if(str.charAt(0)=='[' && str.charAt(str.length-1)==']'){
		var safecurie = str.substring(1, str.length-1).trim();
		if (safecurie.length === 0) {
			return null;
			//throw new Error('Bad SafeCURIE');
		}else{
			return ctx.fromCURIE(safecurie);
		}
	}else{
		var iriref = str.trim();
		var iproto = iriref.indexOf(':');
		if(iproto>=0) var proto = iriref.substring(0, iproto+1);
		if(proto=='_:'){
			return this.mapBlankNode(iriref);
		}else if(proto && Object.hasOwnProperty.call(ctx.prefixes, proto)){
			return this.rdfenv.createNamedNode(ctx.prefixes[proto] + str.substring(iproto+1));
		}else if(proto && Object.hasOwnProperty.call(ctx.prefixesDefault, proto)){
			this.parser.warning('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
			return this.rdfenv.createNamedNode(ctx.prefixesDefault[proto] + str.substring(iproto+1));
		}else{
			return this.rdfenv.createNamedNode(this.resolveReference(iriref));
		}
	}
}
RDFaContext.prototype.fromCURIE = function fromCURIE(str){
	// @href and @src are as defined in the Host Language (e.g., XHTML), and support only an IRI.
	// @vocab supports an IRI.
	var ctx = this;
	var iri = str.trim();
	var iproto = iri.indexOf(':');
	var proto = iri.substring(0, iproto+1);
	if(proto=='_:'){
		return this.mapBlankNode(iri);
	}else if(Object.hasOwnProperty.call(ctx.prefixes, proto)){
		return this.rdfenv.createNamedNode(ctx.prefixes[proto] + str.substring(iproto+1));
	}else if(Object.hasOwnProperty.call(ctx.prefixesDefault, proto)){
		this.parser.warning('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
		return this.rdfenv.createNamedNode(ctx.prefixesDefault[proto] + str.substring(iproto+1));
	}else{
		throw new Error('CURIE not found');
	}
}
RDFaContext.prototype.fromIRI = function fromIRI(str){
	// @href and @src are as defined in the Host Language (e.g., XHTML), and support only an IRI.
	// @vocab supports an IRI.
	var iri = this.resolveReference(str.trim()).toString();
	return this.rdfenv.createNamedNode(iri);
}
RDFaContext.prototype.fromTERMorCURIEorAbsIRI = function fromTERMorCURIEorAbsIRI(str){
	// @datatype supports the datatype TERMorCURIEorAbsIRI - allowing a single Term, CURIE, or Absolute IRI.
	var ctx = this;
	var iproto = str.indexOf(':');
	if(iproto<0){
		var term = str.trim().toLowerCase();
		// No colon, this must be a term
		if(ctx.vocabulary && str){
			return ctx.rdfenv.createNamedNode(ctx.vocabulary + str);
		}else if(Object.hasOwnProperty.call(ctx.terms, term)){
			return ctx.rdfenv.createNamedNode(ctx.terms[term]);
		}else{
			return null;
		}
	}else{
		// Colon present, check for CURIE
		var proto = str.substring(0, iproto+1);
		if(proto==='_:'){
			return ctx.mapBlankNode(str.trim());
		}else if(Object.hasOwnProperty.call(ctx.prefixes, proto)){
			return ctx.rdfenv.createNamedNode(ctx.prefixes[proto] + str.substring(iproto+1));
		}else if(Object.hasOwnProperty.call(ctx.prefixesDefault, proto)){
			this.parser.warning('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
			return ctx.rdfenv.createNamedNode(ctx.prefixesDefault[proto] + str.substring(iproto+1));
		}else{
			return ctx.rdfenv.createNamedNode(str);
		}
	}
}
RDFaContext.prototype.fromTERMorCURIEorAbsIRIs = function fromTERMorCURIEorAbsIRIs(str){
	// @property, @typeof, @rel, and @rev use TERMorCURIEorAbsIRIs
	var ctx = this;
	return tokenize(str).map(function(term){
		return ctx.fromTERMorCURIEorAbsIRI(term);
	}).filter(function(v){ return !!v; });
}

module.exports.RDFaParser = RDFaParser;
function RDFaParser(base, documentElement, rdfenv){
	this.base = base;
	this.documentElement = documentElement;
	this.stack = [];
	this.queries = [];
	// If set to an array, save every RDFaContext in order in contextList
	this.contextList = null;
	this.contextPrefixes = {};
	this.contextTerms = {};
	// Host language configuration/feature switches
	this.setNewSubject = null;
	// Runtime options
	this.emitUsesVocabulary = true;
	if(rdfenv) this.rdfenv = rdfenv;
	this.outputGraph = this.rdfenv.createGraph();
	this.processorGraph = this.rdfenv.createGraph();
	this.XMLSerializer = XMLSerializer;
}

RDFaParser.prototype.RDFaContext = RDFaContext;
RDFaParser.prototype.rdfenv = rdf.environment;

RDFaParser.prototype.initialize = function initialize(){
	this.stack = [];
	var ctx = new this.RDFaContext(this, null);
	ctx.bm = {};
	ctx.skipElement = true;
	// RDFa the 'default prefix' mapping is the XHTML NS
	ctx.prefixes[':'] = XHTMLNS;
	ctx.parentSubject = this.rdfenv.createNamedNode(ctx.base);
	ctx.parentObject = this.rdfenv.createNamedNode(ctx.base);
	ctx.newSubject = this.rdfenv.createNamedNode(ctx.base);
	this.stack.push(ctx);
	if(this.contextList) this.contextList.push(ctx);
}

RDFaParser.prototype.importContext = function importContext(data){
	var self = this;
	for(var k in data.context){
		self.contextPrefixes[k] = data.context[k];
	}
	for(var k in data.terms){
		self.contextTerms[k] = data.terms[k];
	}
}

RDFaParser.prototype.log = function log(message){
	if(this.console) this.console.log.apply(console, arguments);
	var event = this.rdfenv.createBlankNode();
	this.processorGraph.add(this.rdfenv.createTriple(
		event, rdf.rdfns('type'), rdfaNS('Info')
	));
	this.processorGraph.add(this.rdfenv.createTriple(
		event, dcNS('description'), this.rdfenv.createLiteral(message.toString())
	));
}

RDFaParser.prototype.warning = function warning(message){
	if(this.console) this.console.error.apply(console, arguments);
	var event = this.rdfenv.createBlankNode();
	this.processorGraph.add(this.rdfenv.createTriple(
		event, rdf.rdfns('type'), rdfaNS('Warning')
	));
	this.processorGraph.add(this.rdfenv.createTriple(
		event, dcNS('description'), this.rdfenv.createLiteral(message.toString())
	));
}

RDFaParser.prototype.error = function error(message){
	if(this.console) this.console.error.apply(console, arguments);
	var event = this.rdfenv.createBlankNode();
	this.processorGraph.add(this.rdfenv.createTriple(
		event, rdf.rdfns('type'), rdfaNS('Error')
	));
	this.processorGraph.add(this.rdfenv.createTriple(
		event, dcNS('description'), this.rdfenv.createLiteral(message.toString())
	));
}

RDFaParser.prototype.emit = function emit(s, p, o){
	this.outputGraph.add(this.rdfenv.createTriple(s, p, o));
}

RDFaParser.prototype.walkDocument = function walkDocument(document){
	var self = this;
	// Visit each element recursively
	var node = document;
	while(node){
		if(node.nodeType==node.ELEMENT_NODE){
			this.processElement(node);
			var rdfaContext = self.stack[this.stack.length-1];
		}else if(node.nodeType==node.PROCESSING_INSTRUCTION_NODE){
			self.warning('Unhandled PROCESSING_INSTRUCTION_NODE');
		}else if(node.nodeType==node.TEXT_NODE){
		}else if(node.nodeType==node.DOCUMENT_NODE){
			self.processDocument(node);
		}else if(node.nodeType==node.DOCUMENT_TYPE_NODE){
		}else if(node.nodeType==node.COMMENT_NODE){
		}else{
		}
		// Visit the next element recursively
		// If there's a child, visit that
		// Otherwise, try to visit the next sibling
		// Failing that, walk up the tree until there's an element with a nextSibling, and visit that sibling
		if(node.firstChild){
			node = node.firstChild;
		}else{
			while(node && !node.nextSibling){
				if(node.nodeType==node.ELEMENT_NODE || node.nodeType==node.DOCUMENT_NODE){
						self.processNodeEnd(node);
				}
				node = node.parentNode;
			}
			if(node){
				if(node.nodeType==node.ELEMENT_NODE || node.nodeType==node.DOCUMENT_NODE){
						self.processNodeEnd(node);
				}
				node = node.nextSibling;
			}
		}
	}
}

RDFaParser.prototype.getVocab = function getVocab(node){
	return node.hasAttribute('vocab') ? node.getAttribute('vocab') : null;
};
RDFaParser.prototype.getPrefix = function getPrefix(node){
	return node.hasAttribute('prefix') ? node.getAttribute('prefix') : null;
};
RDFaParser.prototype.getRel = function getRel(node){
	return node.hasAttribute('rel') ? node.getAttribute('rel') : null;
};
RDFaParser.prototype.getRev = function getRev(node){
	return node.hasAttribute('rev') ? node.getAttribute('rev') : null;
};
RDFaParser.prototype.getTypeof = function getTypeof(node){
	return node.hasAttribute('typeof') ? node.getAttribute('typeof') : null;
};
RDFaParser.prototype.getProperty = function getProperty(node){
	return node.hasAttribute('property') ? node.getAttribute('property') : null;
};
RDFaParser.prototype.getDatatype = function getDatatype(node){
	return node.hasAttribute('datatype') ? node.getAttribute('datatype') : null;
};
RDFaParser.prototype.getDatetime = function getDatetime(node){
	return node.hasAttribute('datetime') ? node.getAttribute('datetime') : null;
};
RDFaParser.prototype.getContent = function getContent(node){
	return node.hasAttribute('content') ? node.getAttribute('content') : null;
};
RDFaParser.prototype.getAbout = function getAbout(node){
	return node.hasAttribute('about') ? node.getAttribute('about') : null;
};
RDFaParser.prototype.getSrc = function getSrc(node){
	return node.hasAttribute('src') ? node.getAttribute('src') : null;
};
RDFaParser.prototype.getResource = function getResource(node){
	return node.hasAttribute('resource') ? node.getAttribute('resource') : null;
};
RDFaParser.prototype.getHref = function getHref(node){
	return node.hasAttribute('href') ? node.getAttribute('href') : null;
};
RDFaParser.prototype.getInlist = function getInlist(node){
	return node.hasAttribute('inlist') ? node.getAttribute('inlist') : null;
};

RDFaContext.prototype.getRelNode = function getRelNode(node){
	var attr = this.parser.getRel(node);
	if(typeof attr=='string') return this.fromTERMorCURIEorAbsIRIs(attr);
	return attr;
};
RDFaContext.prototype.getRevNode = function getRevNode(node){
	var attr = this.parser.getRev(node);
	if(typeof attr=='string') return this.fromTERMorCURIEorAbsIRIs(attr);
	return attr;
};
RDFaContext.prototype.getTypeofNode = function getTypeofNode(node){
	var attr = this.parser.getTypeof(node);
	if(typeof attr=='string') return this.fromTERMorCURIEorAbsIRIs(attr);
	return attr;
};
RDFaContext.prototype.getPropertyNode = function getPropertyNode(node){
	var attr = this.parser.getProperty(node);
	if(typeof attr=='string') return this.fromTERMorCURIEorAbsIRIs(attr);
	return attr;
};
RDFaContext.prototype.getDatatypeNode = function getDatatypeNode(node){
	var attr = this.parser.getDatatype(node);
	if(typeof attr=='string') return this.fromTERMorCURIEorAbsIRI(attr);
	return attr;
};
// RDFaContext.prototype.getContentNode = function getContentNode(node){
// 	var attr = this.parser.getContent(node);
// 	if(typeof attr=='string') return this.from(attr);
// 	return attr;
// };
RDFaContext.prototype.getAboutNode = function getAboutNode(node){
	var attr = this.parser.getAbout(node);
	if(typeof attr=='string') return this.fromSafeCURIEorCURIEorIRI(attr);
	return attr;
};
RDFaContext.prototype.getSrcNode = function getSrcNode(node){
	var attr = this.parser.getSrc(node);
	if(typeof attr=='string') return this.fromIRI(attr);
	return attr;
};
RDFaContext.prototype.getResourceNode = function getResourceNode(node){
	var attr = this.parser.getResource(node);
	if(typeof attr=='string') return this.fromSafeCURIEorCURIEorIRI(attr);
	return attr;
};
RDFaContext.prototype.getHrefNode = function getHrefNode(node){
	var attr = this.parser.getHref(node);
	if(typeof attr=='string') return this.fromIRI(attr);
	return attr;
};

RDFaParser.prototype.processDocument = function processDocument(node){
	var self = this;
	self.initialize();
	var rdfaContext = self.stack[self.stack.length-1].child(node);
	self.stack.push(rdfaContext);
	if(this.contextList) this.contextList.push(rdfaContext);
}

RDFaParser.prototype.processElement = function processElement(node){
	var self = this;
	var rdfaContext = self.stack[self.stack.length-1].child(node);
//	node.rdfaContext = rdfaContext;
//	console.log('set rdfaContext');
	self.stack.push(rdfaContext);
	if(this.contextList) this.contextList.push(rdfaContext);

	// Step 1
	var typedResource = null;
	// these functions are expected to return null for no attribute, string for attribute
	var setVocab = this.getVocab(node);
	var setPrefix = this.getPrefix(node);
	var setRel = this.getRel(node);
	var setRev = this.getRev(node);
	var setTypeof = this.getTypeof(node);
	var setProperty = this.getProperty(node);
	var setDatatype = this.getDatatype(node);
	var setDatetime = this.getDatetime(node);
	var setContent = this.getContent(node);
	var setAbout = this.getAbout(node);
	var setSrc = this.getSrc(node);
	var setResource = this.getResource(node);
	var setHref = this.getHref(node);
	var setInlist = this.getInlist(node);


	// Amendment. Change IRI base with xml:base
	if(node.hasAttribute('xml:base')){
		rdfaContext.base = rdfaContext.resolveReference(node.getAttribute('xml:base')).toString();
	}
	
	// Step 2. set default vocab
	if(typeof setVocab=='string' && setVocab.trim().length){
		var vocabIRI = rdfaContext.fromIRI(setVocab);
	}
	if(vocabIRI){
		if(this.emitUsesVocabulary){
			this.emit(
				rdfaContext.rdfenv.createNamedNode(rdfaContext.base),
				rdfaNS('usesVocabulary'),
				vocabIRI
			);
		}
		rdfaContext.vocabulary = vocabIRI;
	}else if(setVocab===""){
		rdfaContext.vocabulary = null;
	}

	// Amendment: Import IRI mappings from xmlns
	for(var i=0; i<node.attributes.length; i++){
		var name = node.attributes[i].name;
		if(name.substring(0, 6)=='xmlns:'){
			rdfaContext.prefixes[name.substring(6)+':'] = rdfaContext.fromIRI(node.attributes[i].value.trim());
		}
	}

	// Step 3. set IRI mappings
	if(setPrefix){
		// TODO scan for xmlns assignments too
		var list = tokenize(setPrefix);
		for(var i=0; i<list.length; i+=2){
			var prefixName = list[i];
			// FIXME this is the ASCII subset of allowed names
			// FIXME does NCName allow empty prefixes?
			if(!prefixName.match(/^([A-Za-z_][-.0-9A-Za-z_]*)?:$/)) throw new Error('Invalid prefix');
			// A Conforming RDFa Processor must ignore any definition of a mapping for the '_' prefix
			if(prefixName=='_:') continue;
			// Validate mapped URI @@@TODO Allow Unicode
			var prefixUri = list[i+1];
			if(!prefixUri.match(/^(([^:\/?#]+):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/)) throw new Error('Invalid URI/IRI');
			rdfaContext.prefixes[prefixName] = rdfaContext.fromIRI(prefixUri);
		}
	}

	var termRel = rdfaContext.getRelNode(node);
	var termRev = rdfaContext.getRevNode(node);
	var termTypeof = rdfaContext.getTypeofNode(node);
	var termProperty = rdfaContext.getPropertyNode(node);
	var termDatatype = rdfaContext.getDatatypeNode(node);
	var termAbout = rdfaContext.getAboutNode(node);
	var termSrc = rdfaContext.getSrcNode(node);
	var termResource = rdfaContext.getResourceNode(node);
	var termHref = rdfaContext.getHrefNode(node);

	if(typeof setAbout=='string') var aboutIRI = termAbout;
	else if(node==this.documentElement) var aboutIRI = rdfaContext.base.toString();
	// According to the test suite, even if @about is invalid, it still sometimes considered present and affects processing
	// Handle the condition where @about is invalid, but not otherwise used and still considered present
	var hasAbout = aboutIRI || typeof setAbout=='string';

	if(typeof setResource=='string') var resourceIRI = termResource;

	// Step 4. Set language
	if(node.hasAttribute('lang')){
		var setLang = node.getAttribute('lang');
		if(setLang.match(/^[a-zA-Z]+(-[a-zA-Z0-9]+)*$/)){
			rdfaContext.language = setLang;
		}else if(setLang==''){
			rdfaContext.language = null;
		}else{
			throw new Error('Expected @lang to look like a LangTag');
		}
	}
	if(node.hasAttribute('xml:lang')){
		var setLang = node.getAttribute('xml:lang');
		if(setLang.match(/^[a-zA-Z]+(-[a-zA-Z0-9]+)*$/)){
			rdfaContext.language = setLang;
		}else if(setLang==''){
			rdfaContext.language = null;
		}else{
			throw new Error('Expected @xml:lang to look like a LangTag');
		}
	}

	// Step 5. establish new subject
	if(typeof setRel!='string' && typeof setRev!='string'){
		if(typeof setProperty=='string' && typeof setContent!='string' && typeof setDatatype!='string'){
			// Step 5.1.
			// If the current element contains the @property attribute, but does not contain either the @content or @datatype attributes, then
			// Set new subject
			if(aboutIRI){
				// by using the resource from @about, if present, obtained according to the section on CURIE and IRI Processing;
				rdfaContext.newSubject = aboutIRI;
			}else if(this.setNewSubject && this.setNewSubject(node)){
				rdfaContext.newSubject = rdfaContext.parentObject;
			}else{
				// otherwise, if parent object is present, new subject is set to the value of parent object.
				// parentObject should always be defined at this point
				if(!rdfaContext.parentObject) throw new Error('Expected parentObject');
				rdfaContext.newSubject = rdfaContext.parentObject;
			}
			// If @typeof is present then typed resource is set to the resource obtained from the first match from the following rules:
			if(typeof setTypeof=='string'){
				if(aboutIRI) typedResource = aboutIRI;
				else {
					// "otherwise"
					if(resourceIRI) typedResource = resourceIRI;
					else if(typeof setHref=='string') typedResource = termHref;
					else if(typeof setSrc=='string') typedResource = termSrc;
					else typedResource = rdfaContext.rdfenv.createBlankNode();
					// typeof on an object sets currentObjectResource
					rdfaContext.currentObjectResource = typedResource;
				}
			}
		}else{
			// Step 5.2.
			if(aboutIRI){
				rdfaContext.newSubject = aboutIRI;
			}else if(resourceIRI){
				rdfaContext.newSubject = resourceIRI;
			}else if(typeof setHref=='string'){
				rdfaContext.newSubject = termHref;
			}else if(typeof setSrc=='string'){
				rdfaContext.newSubject = termSrc;
//			}else if(node===this.documentElement){
				// This is set earlier when aboutIRI is computed
//				rdfaContext.newSubject = base.toString();
		}else if(this.setNewSubject && this.setNewSubject(node)){
				rdfaContext.newSubject = rdfaContext.parentObject;
			}else if(typeof setTypeof=='string'){
				rdfaContext.newSubject = rdfaContext.rdfenv.createBlankNode();
			}else{
				// parentObject should always be defined at this point
				if(!rdfaContext.parentObject) throw new Error('Expected parentObject');
				rdfaContext.newSubject = rdfaContext.parentObject;
			}
			if(typeof setTypeof=='string'){
				typedResource = rdfaContext.newSubject;
			}
		}
	}else{
		// Step 6. the current element contains a @rel or @rev attribute.
		// establish both a value for new subject and a value for current object resource.
		if(aboutIRI){
			rdfaContext.newSubject = aboutIRI;
			if(typeof setTypeof=='string'){
				typedResource = rdfaContext.newSubject;
			}
		}else if(this.setNewSubject && this.setNewSubject(node)){
				// by using the resource from @about, if present, obtained according to the section on CURIE and IRI Processing;
				rdfaContext.newSubject = rdfaContext.parentObject;
		}else{
			// rel/rev is present, so statements are chained onto the parent object
			// parentObject should always be defined at this point
			if(!rdfaContext.parentObject) throw new Error('Expected parentObject');
			rdfaContext.newSubject = rdfaContext.parentObject;
		}
		if(resourceIRI){
			rdfaContext.currentObjectResource = resourceIRI;
		}else if(typeof setHref=='string'){
			rdfaContext.currentObjectResource = termHref;
		}else if(typeof setSrc=='string'){
			rdfaContext.currentObjectResource = termSrc;
		}else if(this.setNewSubject && this.setNewSubject(node)){
			rdfaContext.newSubject = rdfaContext.parentObject;
		}else if(typeof setTypeof=='string' && !hasAbout){
			rdfaContext.currentObjectResource = rdfaContext.rdfenv.createBlankNode();
		}
		if(typeof setTypeof=='string' && typeof setAbout!='string'){
			typedResource = rdfaContext.currentObjectResource;
		}
	}

	// If the element does not contain @rel, @rev, @property, @about, @href, @src, @resource, @typeof: then set skipElement <- true
	if(
		typeof setRel!='string'
		&& typeof setRev!='string'
		&& typeof setProperty!='string'
		&& !hasAbout
		&& typeof setHref!='string'
		&& typeof setSrc!='string'
		&& !resourceIRI
		&& typeof setTypeof!='string'
	){
		rdfaContext.skipElement = true;
	}else{
		rdfaContext.skipElement = false;
	}

	// Step 7. Type resources
	if(typedResource && typeof setTypeof=='string'){
		termTypeof.forEach(function(type){
			self.emit(
				typedResource,
				rdfaContext.rdfenv.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				type
			);
		});
	}
	// Step 8
	if(rdfaContext.newSubject && rdfaContext.newSubject.toString()!=rdfaContext.parentObject.toString()){
		rdfaContext.listMapping = {};
	}
	// Step 9.
	if(rdfaContext.currentObjectResource){
		if(!rdfaContext.newSubject) throw new Error('assertion fail: Expected new_subject from an earlier step');
		if(typeof setInlist=='string' && typeof setRel=='string'){
			termRel.forEach(function(predicate){
				if(!rdfaContext.listMapping[predicate]) rdfaContext.listMapping[predicate] = [];
				rdfaContext.listMapping[predicate].push(rdfaContext.currentObjectResource);
			});
		}else if (setRel) {
			termRel.forEach(function(predicate){
				if(predicate.termType=='BlankNode') return;
				self.emit(
					rdfaContext.newSubject,
					predicate,
					rdfaContext.currentObjectResource
				);
			});
		}
		if (setRev) {
			termRev.forEach(function(predicate){
				if(predicate.termType=='BlankNode') return;
				self.emit(
					rdfaContext.currentObjectResource,
					predicate,
					rdfaContext.newSubject
				);
			});
		}
	}else{
		// Step 10.
		// If however current object resource was set to null, but there are predicates present, then they must be stored as incomplete triples, pending the discovery of a subject that can be used as the object.
		// Also, current object resource should be set to a newly created bnode (so that the incomplete triples have a subject to connect to if they are ultimately turned into triples);

		if(rdfaContext.newSubject && !rdfaContext.currentObjectResource && (typeof setRel=='string' || typeof setRev=='string')){
			rdfaContext.currentObjectResource = rdfaContext.rdfenv.createBlankNode();
		}
		if(typeof setRel=='string' && typeof setInlist=='string'){
			termRel.forEach(function(predicate){
				rdfaContext.listMapping[predicate] = [];
				rdfaContext.incomplete.push({direction:0, list:rdfaContext.listMapping[predicate]});
			});
		}else if(typeof setRel=='string'){
			termRel.forEach(function(predicate){
				rdfaContext.incomplete.push({direction:+1, predicate:predicate});
			});
		}
		if(typeof setRev=='string'){
			termRev.forEach(function(predicate){
				rdfaContext.incomplete.push({direction:-1, predicate:predicate});
			});
		}
	}
	// Step 11. Determine the currentPropertyValue, if @property is present
	if(typeof setProperty=='string'){
		var currentPropertyValue = null;
		if(typeof setDatatype=='string' && setDatatype.trim()===''){
			// 2: if @datatype is present and empty
			if(typeof setContent=='string') currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, rdfaContext.language);
			else currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, rdfaContext.language);
		}else if(termDatatype && setDatatype){
			if(self.XMLSerializer && termDatatype.equals(XMLLiteralURI)){
				// 3: as an XML literal if @datatype is present and is set to XMLLiteral
				// The value of the XML literal is a string created by serializing to text, all nodes that are descendants of the current element, i.e., not including the element itself, and giving it a datatype of XMLLiteral in the vocabulary http://www.w3.org/1999/02/22-rdf-syntax-ns#. The format of the resulting serialized content is as defined in Exclusive XML Canonicalization Version 1.0 [XML-EXC-C14N]
				for(var sibling=node.firstChild, xmlData=''; sibling; sibling=sibling.nextSibling) xmlData += self.XMLSerializer(sibling);
				currentPropertyValue = rdfaContext.rdfenv.createLiteral(xmlData, termDatatype);
			}else{
				// 1: if @datatype is present and is not XMLLiteral
				if(typeof setContent=='string') currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, null, termDatatype.toString());
				else currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, null, termDatatype.toString());
			}
		}else if(typeof setContent=='string'){
			// termDatatype = XSDString;
			currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, rdfaContext.language);
		}else if((resourceIRI || setHref || setSrc) && typeof setRel!='string' && typeof setRev!='string' && typeof setContent!='string'){
			if(resourceIRI) currentPropertyValue = resourceIRI;
			else if(typeof setHref=='string') currentPropertyValue = termHref;
			else if(typeof setSrc=='string') currentPropertyValue = termSrc;
		}else if(typedResource && !hasAbout){
			// Spec says "if @typeof is present" but it probably really means typed_resource?
			currentPropertyValue = typedResource;
		}else{
			currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, rdfaContext.language);
		}
		if(!currentPropertyValue){
			console.error(currentPropertyValue);
			throw new Error('Could not determine currentPropertyValue');
		}
		termProperty.forEach(function(predicate){
			if(predicate.termType=='BlankNode') return;
			if(typeof setInlist=='string'){
				if(!rdfaContext.listMapping[predicate]) rdfaContext.listMapping[predicate] = [];
				rdfaContext.listMapping[predicate].push(currentPropertyValue);
			}else{
				self.emit(
					rdfaContext.newSubject,
					predicate,
					currentPropertyValue
				);
			}
		});
	}

	// Step 12. If skip element is false, and new subject is non-null, then complete any incomplete triples from the current context
	if(rdfaContext.skipElement==false && rdfaContext.newSubject){
		rdfaContext.pendingincomplete.forEach(function(statement){
			// If `direction` is 'none' then... what? We don't have a 'none' direction
			if(statement.direction===1){
				self.emit(
					rdfaContext.parentSubject,
					statement.predicate,
					rdfaContext.newSubject
				);
			}else if(statement.direction===-1){
				self.emit(
					rdfaContext.newSubject,
					statement.predicate,
					rdfaContext.parentSubject
				);
			}else if(statement.list){
				statement.list.push(rdfaContext.newSubject);
			}else{
				throw new Error('Unknown direction');
			}
		});
	}

	// Step 13. Process child elements (performed after this function returns)
	// Step 14. see RDFaContext#onPop
}

RDFaParser.prototype.processText = function processText(){
}

RDFaParser.prototype.processNodeEnd = function processElementEnd(){
	this.stack.pop().onPop();
}
