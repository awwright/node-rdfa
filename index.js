
// Phase 1. Support RDFa lite attributes: vocab, typeof, property, resource, and prefix

var rdf = require('rdf');
var IRI = require('iri');

var defaults = require('./defaults.json');

var rdfaNS = rdf.ns('http://www.w3.org/ns/rdfa#');

var console = module.exports.console = { log: function(){}, error: function(){}, };

const StringLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const XMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#XMLLiteral";
const HTMLLiteralURI = "http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML";
const XHTMLNS = "http://www.w3.org/1999/xhtml/vocab#";
const XSDString = "http://www.w3.org/2001/XMLSchema#string";

module.exports.tokenize = tokenize;
function tokenize(s){
	return s.trim().split(/\s+/);
}

module.exports.RDFaContext = RDFaContext;
function RDFaContext(base, node){
	// Settings
	this.depth = 0;
	this.base = base;
	this.node = node;
	this.rdfenv = rdf.environment;
	this.bm = null; // bnode map
	// RDFa context
	this.parentContext = null;
	this.parentSubject = this.rdfenv.createNamedNode(base);
	this.parentObject = null;
	this.pendingincomplete = [];
	this.listMapping = {};
	this.language = null;
	this.prefixes = {};
	this.prefixesDefault = defaults.context;
	this.terms = {};
	this.termsDefault = defaults.terms;
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
	var ctx = new RDFaContext(this.base, node);
	ctx.rdfenv = this.rdfenv;
	ctx.bm = this.bm;
	ctx.parentContext = this;
	ctx.depth = this.depth + 1;
	ctx.base = this.base;
	ctx.prefixesDefault = this.prefixesDefault;
	ctx.termsDefault = this.termsDefault;
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
RDFaContext.prototype.mapBlankNode = function mapBlankNode(name){
	if(this.bm[name]){
		return this.bm[name];
	}
	var bnode = this.bm[name] = this.rdfenv.createBlankNode();
	bnode.nominalValue += '_'+name.substring(2);
	return bnode;
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
			console.error('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
			return this.rdfenv.createNamedNode(ctx.prefixesDefault[proto] + str.substring(iproto+1));
		}else{
			return this.rdfenv.createNamedNode(new IRI.IRI(ctx.base).resolveReference(iriref).toString());
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
		console.error('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
		return this.rdfenv.createNamedNode(ctx.prefixesDefault[proto] + str.substring(iproto+1));
	}else{
		throw new Error('CURIE not found');
	}
}
RDFaContext.prototype.fromIRI = function fromIRI(str){
	// @href and @src are as defined in the Host Language (e.g., XHTML), and support only an IRI.
	// @vocab supports an IRI.
	var iri = new IRI.IRI(this.base).resolveReference(str.trim()).toString();
	return this.rdfenv.createNamedNode(iri);
}
RDFaContext.prototype.fromTERMorCURIEorAbsIRI = function fromTERMorCURIEorAbsIRI(str){
	// @datatype supports the datatype TERMorCURIEorAbsIRI - allowing a single Term, CURIE, or Absolute IRI.
	var ctx = this;
	var term = str.trim();
	var iproto = str.indexOf(':');
	if(iproto<0){
		// No colon, this must be a term
		if(Object.hasOwnProperty.call(ctx.terms, str)){
			return ctx.rdfenv.createNamedNode(ctx.terms[str]);
		}else if(Object.hasOwnProperty.call(ctx.termsDefault, str)){
			console.error('Assumed IRI for term '+str+' = <'+ctx.prefixesDefault[proto]+'>');
			return ctx.rdfenv.createNamedNode(ctx.termsDefault[str]);
		}else if(ctx.vocabulary && str){
			return ctx.rdfenv.createNamedNode(ctx.vocabulary + str);
		}else{
			return null;
		}
	}else{
		// Colon present, check for CURIE
		var proto = str.substring(0, iproto+1);
		if(proto==='_:'){
			return ctx.mapBlankNode(term);
		}else if(Object.hasOwnProperty.call(ctx.prefixes, proto)){
			return ctx.rdfenv.createNamedNode(ctx.prefixes[proto] + str.substring(iproto+1));
		}else if(Object.hasOwnProperty.call(ctx.prefixesDefault, proto)){
			console.error('Assumed prefix for '+proto+' = <'+ctx.prefixesDefault[proto]+'>');
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
function RDFaParser(base, documentElement){
	this.base = '';
	this.documentElement = documentElement;
	this.stack = [];
	this.queries = [];
	this.rdfenv = rdf.environment;
	this.outputGraph = this.rdfenv.createGraph();
	this.processorGraph = this.rdfenv.createGraph();
	var ctx = new RDFaContext(base, null);
	ctx.rdfenv = this.rdfenv;
	ctx.bm = {};
	ctx.skipElement = true;
	// RDFa the 'default prefix' mapping is the XHTML NS
	ctx.prefixes[':'] = XHTMLNS;
	ctx.parentSubject = this.rdfenv.createNamedNode(ctx.base);
	ctx.parentObject = this.rdfenv.createNamedNode(ctx.base);
	ctx.newSubject = this.rdfenv.createNamedNode(ctx.base);
	this.stack.push(ctx);
}

RDFaParser.prototype.processDocument = function processDocument(node){
	var self = this;
	var rdfaContext = self.stack[self.stack.length-1].child(node);
	self.stack.push(rdfaContext);
}

RDFaParser.prototype.processElement = function processElement(node){
	var self = this;
	var rdfaContext = self.stack[self.stack.length-1].child(node);
	self.stack.push(rdfaContext);

	// Step 1
	var typedResource = null;

	var setVocab = node.hasAttribute('vocab') ? node.getAttribute('vocab') : null;
	var setPrefix = node.hasAttribute('prefix') ? node.getAttribute('prefix') : null;
	var setRel = node.hasAttribute('rel') ? node.getAttribute('rel') : null;
	var setRev = node.hasAttribute('rev') ? node.getAttribute('rev') : null;
	var setTypeof = node.hasAttribute('typeof') ? node.getAttribute('typeof') : null;
	var setProperty = node.hasAttribute('property') ? node.getAttribute('property') : null;
	var setDatatype = node.hasAttribute('datatype') ? node.getAttribute('datatype') : null;
	var setDatetime = node.hasAttribute('datetime') ? node.getAttribute('datetime') : null;
	var setContent = node.hasAttribute('content') ? node.getAttribute('content') : null;
	var setAbout = node.hasAttribute('about') ? node.getAttribute('about') : null;
	var setSrc = node.hasAttribute('src') ? node.getAttribute('src') : null;
	var setResource = node.hasAttribute('resource') ? node.getAttribute('resource') : null;
	var setHref = node.hasAttribute('href') ? node.getAttribute('href') : null;
	var setInlist = node.hasAttribute('inlist') ? node.getAttribute('inlist') : null;

	// Amendment. Change IRI base with xml:base
	if(node.hasAttribute('xml:base')){
		rdfaContext.base = new IRI.IRI(rdfaContext.base).resolveReference(node.getAttribute('xml:base')).toString();
	}
	
	// Step 2. set default vocab
	if(typeof setVocab=='string' && setVocab.trim().length){
		var vocabIRI = rdfaContext.fromIRI(setVocab);
	}
	if(vocabIRI){
		// TODO emit UsesVocab
		this.outputGraph.add(rdfaContext.rdfenv.createTriple(
			rdfaContext.rdfenv.createNamedNode(rdfaContext.base),
			rdfaNS('usesVocabulary'),
			vocabIRI
		));
		rdfaContext.vocabulary = vocabIRI;
	}else if(setVocab===""){
		rdfaContext.vocabulary = null;
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
	// Amendment: Import IRI mappings from xmlns
	for(var i=0; i<node.attributes.length; i++){
		var name = node.attributes[i].name;
		if(name.substring(0, 6)=='xmlns:'){
			rdfaContext.prefixes[name.substring(6)+':'] = rdfaContext.fromIRI(node.attributes[i].value.trim());
		}
	}

	if(typeof setAbout=='string') var aboutIRI = rdfaContext.fromSafeCURIEorCURIEorIRI(setAbout);
	else if(node==this.documentElement) var aboutIRI = rdfaContext.base.toString();
	if(typeof setResource=='string') var resourceIRI = rdfaContext.fromSafeCURIEorCURIEorIRI(setResource);

	// Step 4. Set language
	if(node.hasAttribute('lang')){
		rdfaContext.language = node.getAttribute('lang');
	}
	if(node.hasAttribute('xml:lang')){
		rdfaContext.language = node.getAttribute('xml:lang');
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
					else if(typeof setHref=='string') typedResource = rdfaContext.fromIRI(setHref);
					else if(typeof setSrc=='string') typedResource = rdfaContext.fromIRI(setSrc);
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
				rdfaContext.newSubject = rdfaContext.fromIRI(setHref);
			}else if(typeof setSrc=='string'){
				rdfaContext.newSubject = rdfaContext.fromIRI(setSrc);
//			}else if(node===this.documentElement){
				// This is set earlier when aboutIRI is computed
//				rdfaContext.newSubject = base.toString();
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
		}else{
			// rel/rev is present, so statements are chained onto the parent object
			// parentObject should always be defined at this point
			if(!rdfaContext.parentObject) throw new Error('Expected parentObject');
			rdfaContext.newSubject = rdfaContext.parentObject;
		}
		if(resourceIRI){
			rdfaContext.currentObjectResource = resourceIRI;
		}else if(typeof setHref=='string'){
			rdfaContext.currentObjectResource = rdfaContext.fromIRI(setHref);
		}else if(typeof setSrc=='string'){
			rdfaContext.currentObjectResource = rdfaContext.fromIRI(setSrc);
		}else if(typeof setTypeof=='string' && !aboutIRI){
			rdfaContext.currentObjectResource = rdfaContext.rdfenv.createBlankNode();
		}
		if(typeof setTypeof=='string' && !aboutIRI){
			typedResource = rdfaContext.currentObjectResource;
		}
	}

	// If the element does not contain @rel, @rev, @property, @about, @href, @src, @resource, @typeof: then set skipElement <- true
	if(
		typeof setRel!='string'
		&& typeof setRev!='string'
		&& typeof setProperty!='string'
		&& !aboutIRI
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
		rdfaContext.fromTERMorCURIEorAbsIRIs(setTypeof).forEach(function(type){
			self.outputGraph.add(rdfaContext.rdfenv.createTriple(
				typedResource,
				rdfaContext.rdfenv.createNamedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type'),
				type
			));
		});
	}
	// Step 8
	if(rdfaContext.newSubject && rdfaContext.newSubject.toString()!=rdfaContext.parentObject.toString()){
		rdfaContext.listMapping = {};
	}
	// Step 9.
	if(rdfaContext.currentObjectResource){
		if(typeof setInlist=='string' && typeof setRel=='string'){
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRel).forEach(function(predicate){
				rdfaContext.localListMapping[predicate] = [ rdfaContext.currentObjectResource ];
			});
		}else if (setRel) {
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRel).forEach(function(predicate){
				if(predicate.termType=='BlankNode') return;
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rdfaContext.newSubject,
					predicate,
					rdfaContext.currentObjectResource
				));				
			});
		}
		if (setRev) {
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRev).forEach(function(predicate){
				if(predicate.termType=='BlankNode') return;
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rdfaContext.currentObjectResource,
					predicate,
					rdfaContext.newSubject
				));
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
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRel).forEach(function(predicate){
				rdfaContext.localListMapping[predicate] = [];
				rdfaContext.incomplete.push({direction:0, list:rdfaContext.localListMapping[predicate]});
			});
		}else if(typeof setRel=='string'){
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRel).forEach(function(predicate){
				rdfaContext.incomplete.push({direction:+1, predicate:predicate});
			});
		}
		if(typeof setRev=='string'){
			rdfaContext.fromTERMorCURIEorAbsIRIs(setRev).forEach(function(predicate){
				rdfaContext.incomplete.push({direction:-1, predicate:predicate});
			});
		}
	}
	// Step 11. Determine the currentPropertyValue, if @property is present
	if(typeof setProperty=='string'){
		var datatypeIRI = typeof setDatatype=='string' ? rdfaContext.fromTERMorCURIEorAbsIRI(setDatatype) : setDatatype;
		var propertyList = rdfaContext.fromTERMorCURIEorAbsIRIs(setProperty);
		var currentPropertyValue = null;
		if(datatypeIRI && setDatatype && datatypeIRI!==XMLLiteralURI){
			// 1: if @datatype is present and is not XMLLiteral 
			if(typeof setContent=='string') currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, null, datatypeIRI.toString());
			else currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, null, datatypeIRI.toString());
		}else if(typeof setDatatype=='string' && setDatatype.trim()===''){
			// 2: if @datatype is present and empty
			if(typeof setContent=='string') currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, rdfaContext.language);
			else currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, rdfaContext.language);
		}else if(datatypeIRI && datatypeIRI===XMLLiteralURI){
			// 3: as an XML literal if @datatype is present and is set to XMLLiteral
			// The value of the XML literal is a string created by serializing to text, all nodes that are descendants of the current element, i.e., not including the element itself, and giving it a datatype of XMLLiteral in the vocabulary http://www.w3.org/1999/02/22-rdf-syntax-ns#. The format of the resulting serialized content is as defined in Exclusive XML Canonicalization Version 1.0 [XML-EXC-C14N]
			// @@@TODO: serialize XML to string
			throw new Error('Implement');
		}else if(typeof setContent=='string'){
			datatypeIRI = XSDString;
			currentPropertyValue = rdfaContext.rdfenv.createLiteral(setContent, rdfaContext.language);
		}else if(typeof setRel!='string' && typeof setRev!='string' && typeof setContent!='string'){
			if(resourceIRI) currentPropertyValue = resourceIRI;
			else if(typeof setHref=='string') currentPropertyValue = rdfaContext.fromIRI(setHref);
			else if(typeof setSrc=='string') currentPropertyValue = rdfaContext.fromIRI(setSrc);
			else currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, rdfaContext.language);
		}else{
			currentPropertyValue = rdfaContext.rdfenv.createLiteral(node.textContent, rdfaContext.language);
		}
		if(!currentPropertyValue){
			console.error(currentPropertyValue);
			throw new Error('Could not determine currentPropertyValue');
		}
		propertyList.forEach(function(predicate){
			if(predicate.termType=='BlankNode') return;
			if(setInlist){
				rdfaContext.localListMapping[predicate].push(rdfaContext.currentPropertyValue);
			}else{
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rdfaContext.newSubject,
					predicate,
					currentPropertyValue
				));
			}
		});
	}

	// Step 12. If skip element is false, and new subject is non-null, then complete any incomplete triples from the current context
	if(rdfaContext.skipElement==false && rdfaContext.newSubject){
		rdfaContext.pendingincomplete.forEach(function(statement){
			// If `direction` is 'none' then... what? We don't have a 'none' direction
			if(statement.direction===1){
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rdfaContext.parentSubject,
					statement.predicate,
					rdfaContext.newSubject
				));
			}else if(statement.direction===-1){
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rdfaContext.newSubject,
					statement.predicate,
					rdfaContext.parentSubject
				));
			}else if(statement.list){
				statement.list.push(rdfaContext.newSubject);
			}else{
				throw new Error('Unknown direction');
			}
		});
	}

	// Step 13. Process child elements (performed after this function returns)
	// Step 14. @@@TODO generate local list mapping
	for(var prop in rdfaContext.localListMapping){
		// only process lists that were created in the current context
		if(rdfaContext.listMapping[prop]) return;
		var list = rdfaContext.localListMapping[prop];
		if(list.length == 0){
			self.outputGraph.add(rdfaContext.rdfenv.createTriple(
				rdfaContext.parentSubject,
				prop,
				rdf.rdfns('nil')
			));
		}else{
			var first = rdfaContext.parentSubject;
			var rest = rdfaContext.rdfenv.createBlankNode();
			rdfaContext.localListMapping[prop].forEach(function(item, i){
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rest,
					rdf.rdfns('first'),
					first
				));
				self.outputGraph.add(rdfaContext.rdfenv.createTriple(
					rest,
					rdf.rdfns('rest'),
					(i==list.length-1) ? rdf.rdfns('nil') : rest
				));
				rest = first;
				first = rdfaContext.rdfenv.createBlankNode();
			});
		}
	}
}

RDFaParser.prototype.processText = function processText(){
}

RDFaParser.prototype.processNodeEnd = function processElementEnd(){
	this.stack.pop();
}

module.exports.parse = parse;
function parse(base, document, options){
	if(typeof base!=='string') throw new Error('Expected `base` to be a string');
	if(typeof document!=='object') throw new Error('Unexpected argument');
	if(typeof options==='object'){
	}
	var parser = new RDFaParser(base, document.documentElement);
	var node = document;

	if(typeof options==='object'){
		if(options.rdfenv) parser.rdfenv = options.rdfenv;
	}

	function print(s){
		var rdfaContext = parser.stack[parser.stack.length-1];
		var str = '';
		for(var i=0; i<rdfaContext.depth; i++) str += '\t';
		str += s;
		//str += ' depth='+JSON.stringify(rdfaContext.depth);
		str += ' base='+JSON.stringify(rdfaContext.base);
		str += ' vocab=' + JSON.stringify(rdfaContext.vocabulary);
		str += ' language=' + JSON.stringify(rdfaContext.language);
		//str += ' prefixes=' + JSON.stringify(rdfaContext.prefixes);
		str += ' parentObject=' + JSON.stringify(rdfaContext.parentObject);
		console.log(str);
	}

	// Visit each element recursively
	while(node){
		if(node.nodeType==node.ELEMENT_NODE){
			parser.processElement(node);
			var rdfaContext = parser.stack[parser.stack.length-1];
			var ns = node.namespaceURI ? node.namespaceURI.replace('http://www.w3.org/1999/xhtml', 'html:') : '';
			print(
				'<'+ns+' '+node.localName+'>'
				);
		}else if(node.nodeType==node.PROCESSING_INSTRUCTION_NODE){
			print('processinginstruction');
		}else if(node.nodeType==node.TEXT_NODE){
			if(node.data.trim()) print('\t'+JSON.stringify(node.data));
		}else if(node.nodeType==node.DOCUMENT_NODE){
			parser.processDocument(node);
		}else if(node.nodeType==node.DOCUMENT_TYPE_NODE){
			print('doctype');
		}else if(node.nodeType==node.COMMENT_NODE){
			print('// '+node.data);
		}else{
			print('other');
			console.log(node);
		}
		// Visit the next element recursively
		// If there's a child, visit that
		// Otherwise, try to visit the next sibling
		// Failing that, walk up the tree until there's an element with a nextSibling, and visit that sibling
		if(node.firstChild){
			node = node.firstChild;
		}else{
			while(node && !node.nextSibling){
				if(node.nodeType==node.ELEMENT_NODE || node.nodeType==node.DOCUMENT_NODE || node.nodeType==node.DOCUMENT_TYPE_NODE){
						parser.processNodeEnd(node);
				}
				node = node.parentNode;
			}
			if(node){
				if(node.nodeType==node.ELEMENT_NODE || node.nodeType==node.DOCUMENT_NODE || node.nodeType==node.DOCUMENT_TYPE_NODE){
						parser.processNodeEnd(node);
				}
				node = node.nextSibling;
			}
		}
	}
	
	return {
		document: document,
		parser: parser,
		outputGraph: parser.outputGraph,
		processorGraph: parser.processorGraph,
	};
}
