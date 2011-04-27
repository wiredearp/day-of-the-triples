/*
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <wiredearp@wunderbyte.com> wrote this file. As long as you retain this notice 
 * you can do whatever you want with this stuff. If we meet some day, and you 
 * think this stuff is worth it, you can buy me a beer in return. Wired Earp.
 */

window.rdf = {
    
    NAMESPACEURI : "http://www.w3.org/1999/02/22-rdf-syntax-ns#",
    
    RDFNode             : null, // any node
    RDFResource         : null, // resource node
    RDFLiteral          : null, // literal node
    RDFBlankNode        : null, // blank node
    RDFTriple           : null, // an assertion
    RDFService          : null, // creating nodes
    RDFDatasource       : null, // querying nodes
    RDFManager          : null, // indexing nodes
    RDFObserver         : null  // watching nodes
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
 * A literal node in the graph. An object of this interface should  
 * be created in the following way: RDFService.getLiteral ( string )
 * @param {String} string
 */
rdf.RDFLiteral = function ( string ) { this.value = string; };
rdf.RDFLiteral.prototype = new rdf.RDFNode;
rdf.RDFLiteral.prototype.toString = function () {
    return "[object RDFLiteral]";
};

/**
 * A blank node in the RDF data model. An object of this interface should be  
 * created in the following way: RDFService.getResource ( RDFService.generateID ());
 */
rdf.RDFBlankNode = function ( id ) { this.value = id; };
rdf.RDFBlankNode.PREFIX = "_:node";
rdf.RDFBlankNode.prototype = new rdf.RDFResource;
rdf.RDFBlankNode.prototype.toString = function () {
    return "[object RDFBlankNode]";
};


// RDFTriple ..............................................................

/**
 * The RDFTriple is not used around here, but you can build it if you like. 
 * We infer triples from a three-dimensional hashmap, @see rdf.RDFManager
 * @param {RDFResource} sub
 * @param {RDFResource} pre
 * @param {RDFNode} obj
 */
rdf.RDFTriple = function ( sub, pre, obj ) {
    
    this.subject = sub;
    this.predicate = pre;
    this.object = obj;
};

rdf.RDFTriple.prototype = {
        
    /**
     * @return {String}
     */
    toString : function () {
    
        return "[object RDFTriple]";
    },
      
    /**
     * @type {RDFResource}
     */
    subject : null,
    
    /**
     * @type {RDFResource}
     */
    predicate : null,
    
    /**
     * @type {RDFNode}
     */
    object : null,
    
    /**
     * Serialize to N-Triple.
     * @see http://www.w3.org/2001/sw/RDFCore/ntriples/
     * @returns {String}
     */
    serialize : function () {
        
        var sub = this.subject.value;
        var pre = this.predicate.value;
        var obj = this.object.value;
        
        var res = this.object instanceof rdf.RDFResource;
        var result = "<" + sub + "> <" + pre + "> ";
        result += res ? "<" + obj + "> " : "\"" + obj + "\" ";
        return result;
    }
};


// RDFService ..................................................................

/**
 * The RDFService is a top level interface which can be queried for pointers to 
 * RDFNodes. Remember that RDFNodes doesn't actually do anything untill you 
 * evaluate them in the context of a RDFDatasource.
 */
rdf.RDFService = new function () {
    
    var identities = 1;
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
     * @param @optional {String} uri Omit to create a blank node.
     * @returns {RDFResource}
     */
    this.getResource = function ( uri ) {
        
        if ( !uri || uri === "" ) {
            uri = this.generateID ();
        }
        if ( !resources [ uri ]) {
            if ( uri.indexOf ( rdf.RDFBlankNode.PREFIX ) === 0 ) {
                resource = new rdf.RDFBlankNode ( uri );
            } else {
                resource = new rdf.RDFResource ( uri );
            }
            resources [ uri ] = resource;
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
    
    /**
     * Generate ID for blank nodes.
     * @returns {String}
     */
    this.generateID = function () {
        
        return rdf.RDFBlankNode.PREFIX + identities ++;
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
    
    this._triples = new rdf.RDFManager ();
    this._observers = [];
};
    
rdf.RDFDatasource.prototype = {
        
    /**
     * Local triple manager.
     * @type {RDFManager}
     */
    _triples : null,
    
    /**
     * List of datasource observers.
     * @type {Array<RDFObserver>}
     */
    _observers : null,
    
    /**
     * Tracking assertions while batch updating.
     * @type {RDFDatasource}
     */
    _adata : null,
    
    /**
     * Tracking unassertions while batch updating.
     * @type {RDFDatasource}
     */
    _udata : null,
    
    /**
     * True while performing a batch update.
     * @type {boolean}
     */
    _isBatch : false,
    
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
        
        this._observers.forEach ( function ( observer ) {
            observer.onAssert ( this, subject, predicate, object );
        }, this );
        
        if ( this._adata !== null ) {
            this._adata.assert ( subject, predicate, object );
        }
    },
    
    /**
     * Unassert datasource triple.
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @param {RDFNode} object
     */
    unassert : function ( subject, predicate, object ) {
        
        if ( this.hasAssertion ( subject, predicate, object )) {
        
            var sub = subject.value;
            var pre = predicate.value;
            var obj = object.value;
            
            if ( this._triples.getObject ( sub, pre, obj )) {
                this._triples.remove ( sub, pre, obj );
                if ( this.arcsOut ( predicate ).length === 0 ) {
                    this._triples.remove ( sub, pre );
                    if ( this.arcsOut ( subject ).length === 0 ) {
                        this._triples.remove ( sub );
                    }
                }
            }
            
            this._observers.forEach ( function ( observer ) {
                observer.onUnassert ( this, subject, predicate, object );
            }, this );
            
            if ( this._udata !== null ) {
                this._udata.assert ( subject, predicate, object );
            }
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
     * Get all instances of RDFResource (excluding RDFLiterals). 
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
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @returns {RDFNode}
     */
    getObject : function ( subject, predicate ) {
        
        var sub = subject.value;
        var pre = predicate.value;
        
        var obj, result = null;
        for ( obj in this._triples.getObjects ( sub, pre )) {
            result = this._triples.getObject ( sub, pre, obj );
            break;
        }
        return result;
    },
        
    /**
     * Get all objects.
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @returns {Array<RDFNode>}
     */
    getObjects : function ( subject, predicate ) {
        
        var sub = subject.value;
        var pre = predicate.value;
        
        var obj, result = [];
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
        
        var pre = predicate.value;
        var obj = object.value;
        
        var sub, result = null;
        for ( sub in this._triples.getSubjects ()) {
            if ( this._triples.getObject ( sub, pre, obj )) {
                result = rdf.RDFService.getResource ( sub );
                break;
            }
        }
        return result;
    },
    
    /**
     * Get all subjects.
     * @param {RDFResource} predicate
     * @param {RDFNode} object
     * @returns {Array<RDFResource>}
     */
    getSubjects : function ( predicate, object ) {
        
        var pre = predicate.value;
        var obj = object.value;
        
        var sub, result = [];
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
     * Add datasource observer.
     * @param {RDFObserver} observer
     */
    addObserver : function ( observer ) {

        for ( var method in rdf.RDFObserver.prototype ) {
            if ( observer [ method ] === undefined ) {
                throw new TypeError ();
            }
        }
        this._observers.push ( observer );
    },
    
    /**
     * Remove datasource observer.
     * @param {RDFObserver} observer
     */
    removeObserver : function ( observer ) {
        
        var i = this._observers.indexOf ( observer );
        
        if ( i !== -1 ) {
            var rest = this._observers.slice ( i + 1 );
            this._observers.length = i;
            this._observers.push ( rest ); 
        }
    },
    
    /**
     * Notify observers that the datasource is about to send multiple notifications. 
     * Observer methods onChange and onMove depend on this being invoked prior to 
     * datasource updates. Calling this should be followed by a call to batchEnd.
     */
    batchBegin : function () {
        
        if ( !this._isBatch ) {
            this._isBatch = true;
            if ( this._observers.length > 0 ) {
                this._adata = new rdf.RDFDatasource ();
                this._udata = new rdf.RDFDatasource ();
                this._observers.forEach ( function ( observer ) {
                    observer.onBatchBegin ( this );
                }, this );
            }
        }
    },
    
    /**
     * Notify observers that the datasource has completed multiple notifications.
     */
    batchEnd : function () {
        
        if ( this._isBatch ) {
            this._isBatch = false;
            if ( this._observers.length > 0 ) {
                this._observers.forEach ( function ( observer ) {
                    observer.onBatchEnd ( this );
                }, this );
                if ( this._adata !== null ) {
                    this._resolveBatch ();
                    this._adata = null;
                    this._udata = null;
                }
            }
        }
    },
    
    /**
     * Notify observers that a subject was moved or an object was changed.
     */
    _resolveBatch : function () {
        
        this._udata.getTriples ().forEach ( function ( triple ) {
            
            var sub = triple.subject,
                pre = triple.predicate,
                obj = triple.object,
                nes = this._adata.getSubject ( pre, obj ),
                neo = this._adata.getObject ( sub, pre );
            
            if ( nes ) {
                this._observers.forEach ( function ( observer ) {
                    observer.onMove ( this, sub, nes, pre, obj );
                }, this );
            }
            if ( neo ) {
                this._observers.forEach ( function ( observer ) {
                    observer.onChange ( this, sub, pre, obj, neo );
                }, this );
            }
        }, this );
        
        
    },
    
    /**
     * Get assertions as instances of RDFTriple.
     * @returns {Array<RDFTriple>}
     */
    getTriples : function () {
        
        var subject, predicate, object;
        var result = [], triples = this._triples;
        for ( var sub in triples.getSubjects ()) {
            subject = rdf.RDFService.getResource ( sub );
            for ( var pre in triples.getPredicates ( sub )) {
                predicate = rdf.RDFService.getResource ( pre );
                for ( var obj in triples.getObjects ( sub, pre, obj )) {
                    object = triples.getObject ( sub, pre, obj );
                    result.push ( new rdf.RDFTriple ( subject, predicate, object ));
                }
            }
        }
        return this._randomize ( result );
    },
    
    /**
     * Clone datasource. This will not copy any RDFObservers attached.
     * @returns {RDFDatasource}
     */
    clone : function () {
        
        var clone = new rdf.RDFDatasource ();
        this.getTriples ().forEach ( function ( triple ) {
            clone.assert ( triple.subject, triple.predicate, triple.object );
        });
        return clone;
    },
    
    /**
     * Serialize datasource to N-Triples.
     * @see http://www.w3.org/2001/sw/RDFCore/ntriples/
     */
    serialize : function () {
        
        var list = [], triples = this.getTriples ();
        triples.forEach ( function ( triple ) {
            list.push ( triple.serialize ());
        });
        return list.join ( "\n" );
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

/**
 * [static] Update datasource using another datasource as input. 
 * When finished, target datasource will be identical to source;
 * triples not represented in source will be deleted.   
 * @param {RDFDatasource} source
 * @param {RDFDatasource} target
 * @returns {boolean} True if target data was changed
 */
rdf.RDFDatasource.updateFrom = function ( source, target ) {
    
    var result = false;
    
    var adata = [];
    source.getTriples ().forEach ( function ( t ) {
        if ( !target.hasAssertion ( t.subject, t.predicate, t.object )) {
            adata.push ( t );
        }
    });
    
    var udata = [];
    target.getTriples ().forEach ( function ( t ) {
        if ( !source.hasAssertion ( t.subject, t.predicate, t.object )) {
            udata.push ( t );
        }
    });
    
    if ( adata.length > 0 || udata.length > 0 ) {
        
        target.batchBegin ();
        adata.forEach ( function ( t ) {
            target.assert ( t.subject, t.predicate, t.object );
        });
        udata.forEach ( function ( t ) {
            target.unassert ( t.subject, t.predicate, t.object );
        });
        target.batchEnd ();
        result = true;
    }
    
    return result;
};


// RDFManager .............................................................

/**
 * Not to be invoked by users; consider this a private member of your RDFDatasource.
 * TODO: Potential ambiguity problem; perhaps to be solved by another level of maps?
 */
rdf.RDFManager = function () {
    
    this._map = {};
};

rdf.RDFManager.prototype = {
   
    /**
     * Three level map, indexing URIs and RDFnodes. Object members - the third 
     * level in hashmaps - are stored as RDFNode instances so that we can later 
     * determine whether it's an RDFResource or a RDFLiteral. Because hashmaps 
     * are indexed by RDFNode.value, the setup will fail in the unlikely event 
     * that a RDFLiteral.value is identical to a RDFResouce.value. Unless the 
     * content is used to describe the RDF model itself, this should work out.
     * @type {Map<String,<String,<String,RDFNode>>>}
     */
    _map : null,
    
    /**
     * @return {String}
     */
    toString : function () {
        
        return "[object RDFManager]";
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
    },
    
    /**
     * Remove map entries.
     * TODO: Should we move sanitation of empty map structures from RDFDatasource#unassert to here?  
     * @param {String} sub
     * @param @optional {String} pre
     * @param @optional {String} obj
     */
    remove : function ( sub, pre, obj ) {
        
        if ( sub && pre && obj ) {
            delete this._map [ sub ][ pre ][ obj ];
        } else if ( sub && pre ) {
            delete this._map [ sub ][ pre ];
        } else if ( sub ) {
            delete this._map [ sub ];
        }
    }
};


// RDFObserver .................................................................

/**
 * Interface for an object that can be associated to a datasource 
 * in order to intercept low level changes to the data structure. 
 * @see {RDFDatasource#addObserver}
 */
rdf.RDFObserver = function () {};
rdf.RDFObserver.prototype = {
        
    /**
     * @returns {String}
     */
    toString : function () { return "[object RDFObserver]"; },
    
    /**
     * Called when a new assertion is made in a datasource.
     * @param {RDFDatasource} datasource
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @param {RDFNode} object
     */
    onAssert : function ( datasource, subject, predicate, object ) {},
    
    /**
     * Called when an assertion is deleted from a datasource.
     * @param {RDFDatasource} datasource
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @param {RDFNode} object
     */
    onUnassert : function ( datasource, subject, predicate, object ) {},
    
    /**
     * Called when the object of an assertion changes value. This implies 
     * that the old assertion was deleted and a new assertion was created. 
     * This method will only be called if the datasource updater invoked 
     * method batchBegin on the datasource before performing the updates.
     * @param {RDFDatasource} datasource
     * @param {RDFResource} subject
     * @param {RDFResource} predicate
     * @param {RDFNode} oldobject
     * @param {RDFNode} newobject
     */
    onChange : function ( datasource, subject, predicate, oldobject, newobject ) {},
    
    /**
     * Called when the subject of an assertion changes value. Note that 
     * This method will only be called if the datasource updater invoked 
     * method batchBegin on the datasource before performing all updates.
     * @param {RDFDatasource} datasource
     * @param {RDFResource} oldsubject
     * @param {RDFResource} newsubject
     * @param {RDFResource} predicate
     * @param {RDFNode} object
     */
    onMove : function ( datasource, oldsubject, newsubject, predicate, object ) {},
    
    /**
     * Called when a datasource is about to send multiple notifications;
     * Observer may disable intensive processing to optimize performance.
     * @param {RDFDatasource} datasource
     */
    onBatchBegin : function ( datasource ) {},
    
    /**
     * Called when a datasource has completed multiple notifications.
     * @param {RDFDatasource} datasource
     */
    onBatchEnd : function ( datasource ) {}
};