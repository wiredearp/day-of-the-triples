/*
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <wiredearp@wunderbyte.com> wrote this file. As long as you retain this notice 
 * you can do whatever you want with this stuff. If we meet some day, and you 
 * think this stuff is worth it, you can buy me a beer in return. Wired Earp.
 */

window.rdf = {
		
	NAMESPACEURI : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
	
	RDFNode				: null, // any node
	RDFResource			: null, // resource node
	RDFLiteral			: null, // literal node
	RDFService			: null, // creating nodes
	RDFDatasource		: null, // querying nodes
	RDFTriples			: null  // indexing nodes
};


// RDFNode .....................................................................

/**
 * An abstract entity in the RDF model.
 */
rdf.RDFNode = function () {};
rdf.RDFNode.prototype = {
	value : null,
	toString : function () {
		return "[object RDFNode]";
	}
};

/**
 * An RDFResource is an object that has unique identity in the RDF data model. 
 * The object's identity is determined by its URI. An object of this interface 
 * should be created in the following way: RDFService.getResource ( uri )
 * @param {String} uri
 */
rdf.RDFResource = function ( uri ) { this.value = uri; };
rdf.RDFResource.prototype = new rdf.RDFNode;
rdf.RDFResource.prototype.toString = function () {
	return "[object RDFResource]";
};

/**
 * A literal node in the graph, whose value is a string. An object of this interface 
 * should be created in the following way: RDFService.getLiteral ( string )
 * @param {String} string
 */
rdf.RDFLiteral = function ( string ) { this.value = string; };
rdf.RDFLiteral.prototype = new rdf.RDFNode;
rdf.RDFLiteral.prototype.toString = function () {
	return "[object RDFLiteral]";
};

/**
 * TODO...
 *
rdf.RDFBlankNode = function ( uri ) { this.value = something computed };
rdf.RDFBlankNode.prototype = new rdf.RDFResource;
rdf.RDFBlankNode.prototype.toString = function () {
	return "[object RDFBlankNode]";
};
*/


// RDFService ..................................................................

/**
 * The RDFService is a top level interface which can be queried for pointers to 
 * RDFNodes. Remember that RDFNodes doesn't actually do anything untill you 
 * evaluate them in the context of a RDFDatasource.
 */
rdf.RDFService = new function () {
	
	var resources = {};
	var literals = {};
	
	/**
	 * @return {String}
	 */
	this.toString = function () {
		
		return "[object RDFService]";
	};
	
	/**
	 * Get RDFResource. The requested resource is constructed if not already defined.
	 * TODO: Blank nodes. For now we use RDFResource with "_" underscore prefix.
	 * @param {String} uri
	 * @returns {RDFResource}
	 */
	this.getResource = function ( uri ) {
		
		if ( uri === undefined ) {
			uri = "_" + String ( Math.random ()).split ( "." )[ 1 ];
		}
		if ( !resources [ uri ]) {
			resources [ uri ] = new rdf.RDFResource ( uri );
		}
		return resources [ uri ];
	};
	
	/**
	 * Get RDFLiteral. The requested litereal is constructed if not already defined.
	 * @param {string} string
	 * @returns {RDFLiteral}
	 */
	this.getLiteral = function ( string ) {
		
		if ( !literals [ string ]) {
			literals [ string ] = new rdf.RDFLiteral ( string );
		}
		return literals [ string ]; 
	};
};


// RDFDatasource ................................................................

/**
 * YOU HAVE        YOU WANT             YOU NEED
 *
 * sub pre obj
 * sub             pre                  arcsOut
 * sub             obj                  arcsOut and then getObject(s)
 * sub pre         obj                  getObject or getObjects
 *         obj     pre                  arcsIn
 *         obj     sub                  arcsIn and then getSubject(s)
 *     pre obj     sub                  getSubject or getSubjects
 * sub pre         existence of obj     hasObject
 * pre obj         existence of sub     hasSubject
 * sub pre obj     existence            hasAssertion
 */

rdf.RDFDatasource = function () {

	this._triples = new rdf.RDFTriples ();
};
	
rdf.RDFDatasource.prototype = {
		
	/**
	 * @type {RDFTriples}
	 */
	_triples : null,
	
	/**
	 * @return {String}
	 */
	toString : function () {
		
		return "[object RDFDatasource]";
	},
	
	/**
	 * Assert datasource triple.
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 */
	assert : function ( subject, predicate, object ) {
	
		var sub = subject.value;
		var pre = predicate.value;
		var obj = object.value;
		
		if ( !this._triples.getSubject ( sub )) {
			this._triples.addSubject ( sub );
		}
		if ( !this._triples.getPredicate ( sub, pre )) {
			this._triples.addPredicate ( sub, pre );
		}
		if ( !this._triples.getObject ( sub, pre, obj )) {
			this._triples.addObject ( sub, pre, obj, object  );
		}
	},
	
	/**
	 * Query for existence of assertion.
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 * @returns {boolean}
	 */
	hasAssertion : function ( subject, predicate, object ) {
		
		var sub = subject.value;
		var pre = predicate.value;
		var obj = object.value;
		
		return this._triples.getObject ( sub, pre, obj ) ? true : false;
	},
		
	/**
	 * Get all instances of RDFResource.
	 * @returns {Array<RDFResource>}
	 */ 
	getResources : function () {
	
		var triples = this._triples;
		var resource, result = [], values = {};
		
		for ( var sub in triples.getSubjects ()) {
			resource = rdf.RDFService.getResource ( sub );
			result.push ( resource );
			values [ sub ] = true;
			for ( var pre in triples.getPredicates ( sub )) {
				resource = rdf.RDFService.getResource ( pre );
				if ( !values [ pre ]) {
					result.push ( resource );
					values [ pre ] = true;
				}
				for ( var obj in triples.getObjects ( sub, pre )) {
					var object = triples.getObject ( sub, pre, obj );
					if ( object instanceof rdf.RDFResource && values [ obj ]) {
						result.push ( object );
						values [ obj ] = true;
					}
				}
			}
		}
		return this._randomize ( result );
	},
	
	/**
	 * Get first object found.
	 * TODO: Performance this.
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @returns {RDFNode}
	 */
	getObject : function ( subject, predicate ) {
		
		var targets = this.getObjects ( subject, predicate );
		return targets.length > 0 ? targets [ 0 ] : null;
	},
		
	/**
	 * Get all objects.
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @returns {Array<RDFNode>}
	 */
	getObjects : function ( subject, predicate ) {
	
		var result = [];
		var sub = subject.value;
		var pre = predicate.value;
		var obj;
		
		for ( obj in this._triples.getObjects ( sub, pre )) {
			result.push ( this._triples.getObject ( sub, pre, obj ));
		}
		return this._randomize ( result );
	},
		
	/**
	 * Get first subject found.
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 * @returns {RDFResource}
	 */
	getSubject : function ( predicate, object ) {
		
		var subjects = this.getSubjects ( predicate, object );
		return subjects.length > 0 ? subjects [ 0 ] : null;
	},
	
	/**
	 * Get all subject.
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 * @returns {Array<RDFResource>}
	 */
	getSubjects : function ( predicate, object ) {
		
		var pre = predicate.value;
		var obj = object.value;
		var sub;
		
		var subject, result = [];
		for ( sub in this._triples.getSubjects ()) {
			if ( this._triples.getObject ( sub, pre, obj )) {
				result.push ( rdf.RDFService.getResource ( sub ));
			}   
		}
		return this._randomize ( result );
	},
	
	/**
	 * Subject predicates object?
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 * @returns {boolean}
	 */
	hasObject : function ( subject, predicate, object ) {
	
		var pre = predicate.value;
		var obj = object.value;
		var sub = subject.value;
		
		return this._triples.getObject ( sub, pre, obj ) ? true : false;
	},
	
	/**
	 * Object predicated by subject?
	 * TODO: Test this on real data!
	 * @param {RDFResource} subject
	 * @param {RDFResource} predicate
	 * @param {RDFNode} object
	 * @returns {boolean}
	 */
	hasSubject : function ( subject, predicate, object ) {
		
		var node = this.getObject ( subject, predicate, object );
		return node !== null;
	},
	
	/**
	 * Get nodes from arcs that originate in a resource.
	 * @param {RDFResource} resource
	 * @returns {Array<RDFNode>}
	 */ 
	arcsOut : function ( resource ) {
		
		var triples = this._triples;
		var result = [], values = {};
		var sub, pre, obj;
		
		sub = triples.getSubject ( resource.value );
		if ( sub ) {
			for ( pre in sub ) {
				result.push ( rdf.RDFService.getResource ( pre ));
			}
		} else {
			for ( sub in triples.getSubjects ()) {
				for ( pre in triples.getPredicates ( sub )) {
					if ( pre === resource.value ) {
						for ( obj in triples.getObjects ( sub, pre )) {
							var object = triples.getObject ( sub, pre, obj );
							if ( !values [ obj ]) {
								result.push ( object );
								values [ obj ] = true;
							}
						}
					}
				}
			}
		}
		return this._randomize ( result );
	},
	
	/**
	 * Get resources with arcs pointing to a node. 
	 * TODO: Test this on real data!
	 * @param {RDFResource} resource
	 * @returns {Arrary<RDFResource>}
	 */ 
	arcsIn : function ( node ) {
		
		var sub, pre, obj, res;
		var result = [], values = {};
		var is = node instanceof rdf.RDFResource;
		
		for ( sub in triples.getSubjects ()) {
			for ( pre in triples.getPredicates ( sub )) {
				if ( is && pre === node.value ) {
					res = RDFService.getResource ( sub );
					if ( !values [ res ]) {
						result.push ( res );
						values [ res ] = true;
					}
				}
				for ( obj in triples.getObjects ( sub, pre )) {
					var object = triples.getObject ( sub, pre, obj );
					if ( object === node ) {
						res = RDFService.getResource ( pre );
						if ( !values [ res ]) {
							result.push ( res );
							values [ res ] = true;
						}
					}	
				}
			}
		}
		return this._randomize ( result );
	},
	
	/**
	 * Serialize datasource to N-Triples.
	 * @see http://www.w3.org/2001/sw/RDFCore/ntriples/
	 */
	serialize : function () {
		
		var list = [], triples = this._triples;
		for ( var sub in triples.getSubjects ()) {
			for ( var pre in triples.getPredicates ( sub )) {
				for ( var obj in triples.getObjects ( sub, pre, obj )) {
					var object = triples.getObject ( sub, pre, obj );
					var isResource = object instanceof rdf.RDFResource;
					var triple = "<" + sub + "> ";
					triple += "<" + pre + "> ";
					triple += isResource ? "<" + obj + "> " : "\"" + obj + "\" ";
					list.push ( triple );
				}
			}
		}
		return this._randomize ( list ).join ( "\n" );
	},
	
	/**
	 * Randomize an array. RDF users should not think that graphs 
	 * has a pre-defined beginning and end, so let's remove any  
	 * indication of fixed structure from an array of RDFNodes.
	 * @param {Array<RDFNode>} nodes
	 * @returns {Array<RDFNode>} 
	 */
	_randomize : function ( nodes ) {
		 
		return nodes.sort ( function () {
			return Math.random () > 0.5 ? 0 : 1;
		});
	}
};


// RDFTriples .............................................................

/**
 * Not to be invoked by users; consider this a private member of your RDFDatasource.
 * TODO: Potential ambiguity problem. Prefix hashmap keys according to node type? 
 * Or maybe split the third level into three maps: Resources, literals and blanks?
 */
rdf.RDFTriples = function () {};

rdf.RDFTriples.prototype = {
   
	/**
	 * Three level map, indexing URIs and RDFnodes. Object members - the third 
	 * level in hashmaps - are stored as RDFNode instances so that we can later 
	 * determine whether it's an RDFResource or a RDFLiteral. Because hashmaps 
	 * are indexed by RDFNode.value, the setup will fail in the unlikely event 
	 * that a RDFLiteral.value is identical to a RDFResouce.value. Unless the 
	 * content is used to describe the RDF model itself, this should work out.
	 * @type {Map<String,<String,<String,RDFNode>>>}
	 */
	_map : {},
	
	/**
	 * @return {String}
	 */
	toString : function () {
		
		return "[object RDFTriples]";
	},
	
	/**
	 * Add subject.
	 * @param {String} sub
	 */
	addSubject : function ( sub ) {
		
		this._map [ sub ] = {};
	},
	
	/**
	 * Get subject.
	 * @param {String} sub
	 * @returns {Map}
	 */
	getSubject : function ( sub ) {
		
		var result = null;
		if ( this._map [ sub ]) {
			result = this._map [ sub ];
		}
		return result;
	},
	
	/**
	 * Get subjects.
	 * @returns {Map}
	 */
	getSubjects : function () {
		
		return this._map;
	},
	
	/**
	 * Add predicate.
	 * @param {String} sub
	 * @param {String} pre
	 */
	addPredicate : function ( sub, pre ) {
		
		this._map [ sub ][ pre ] = {};
	},
	
	/**
	 * Get predicate for subject.
	 * @param {String} sub
	 * @param {String} pre
	 * @returns {Map}
	 */
	getPredicate : function ( sub, pre ) {
		
		var result = null, map = this._map;
		if ( map [ sub ] && map [ sub ][ pre ]) {
			result = map [ sub ][ pre ];
		}
		return result;
	},
	
	/**
	 * Get map of predicates for subject.
	 * @param {String} sub
	 * @returns {Map}
	 */
	getPredicates : function ( sub ) {
		
		return this._map [ sub ];
	},
	
	/**
	 * Add object.
	 * @param {String} sub
	 * @param {String} pre
	 * @param {String} obj
	 * @param {RDFNode} object
	 */
	addObject : function ( sub, pre, obj, object ) {
		
		this._map [ sub ][ pre ][ obj ] = object;
	},
	
	/**
	 * Get object.
	 * @param {String} sub
	 * @param {String} pre
	 * @param {String} obj
	 * @returns {RDFNode}
	 */
	getObject : function ( sub, pre, obj ) {
		
		var result = null, map = this._map;
		if ( map [ sub ] && map [ sub ][ pre ] && map [ sub ][ pre ][ obj ]) {
			result = map [ sub ][ pre ][ obj ];
		}
		return result;
	},
	
	/**
	 * Get map of objects.
	 * @param {String} sub
	 * @param {String} pre
	 * @returns {Map<String,RDFNode>}
	 */
	getObjects : function ( sub, pre ) {
		
		var result = null;
		if ( this._map [ sub ]) {
			result = this._map [ sub ][ pre ];
		}
		return result;
	}
};