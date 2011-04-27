/*
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <wiredearp@wunderbyte.com> wrote this file. As long as you retain this notice 
 * you can do whatever you want with this stuff. If we meet some day, and you 
 * think this stuff is worth it, you can buy me a beer in return. Wired Earp.
 */


// RDFa ......................................................................

/**
 * Populates RDF datasource by analyzing RDFa annotated document. 
 */
rdf.RDFa = new function () {
    
    /**
     * [static] Analyze RDFa, build RDF. 
     * @param {Document} doc
     * @param {RDFDatasource} ds
     */
    this.index = function ( doc, ds ) {
        
        if ( doc.nodeType === Node.DOCUMENT_NODE ) {
            new rdf.RDFaCrawler ( doc, ds ).go ();
        } else {
            throw "Please index a Document node";
        }
    };
};


// RDFaAssitant ...............................................................

/**
 * Assistant methods.
 */
rdf.RDFaAssistant = new function () {
    
    // matches URL
    var uri = /^(http|https)\:\/\/[a-zA-Z0-9\-\.]+\.[a-zA-Z]{2,4}(\/?[a-zA-Z0-9]*)+#?[a-zA-Z0-9]*$/;
    
    // matches URN
    var urn = /^urn:[a-zA-Z0-9]{1}[a-zA-Z0-9\-]{1,31}:[a-zA-Z0-9_,:=@;!'%\/#\(\)\+\-\.\$\*\?]+/;
    
    /**
     * [static] Looks like a qualified URI?
     * @param {String} term
     * @returns {boolean}
     */
    this.looksURI = function ( term ) {
        
        return uri.test ( term ) || urn.test ( term ); 
    };
};


// RDFaContext ..............................................................

/**
 * RDFa evaluation context.
 * @param {String} base
 * @param {String} suri
 * @param {String} ouri
 * @param {Map<String,String>} uris
 * @param {Array<RDFaTriple>} list
 * @param {String} lang
 */
rdf.RDFaContext = function ( base, suri, ouri, uris, list, lang ) {
    
    this.base = base;
    this.suri = suri;
    this.ouri = ouri;
    this.uris = uris;
    this.list = list;
    this.lang = lang;
};

rdf.RDFaContext.prototype = {
    
    base : null, // [base]
    suri : null, // [parent subject]
    ouri : null, // [parent object resource]
    uris : null, // [list of URI mappings]
    list : null, // [list of incomplete triples]
    lang : null  // [language]
};


// RDFaTriple ................................................................

/**
 * Carries an [incomplete triple] while searching for subjects.
 * @param {String} uri
 * @param {String} dir
 */
rdf.RDFaTriple = function ( uri, dir ) {
    
    this.predicate = uri;
    this.direction = dir;
};

rdf.RDFaTriple.prototype = {

    predicate : null,
    direction : null
};


// RDFattributes ...........................................................

/**
 * Index of RDF attributes implicitely associated to an element. 
 * Note that the typeof attribute was renamed to avoid keyword.
 */
rdf.RDFattributes = function () {};
rdf.RDFattributes.prototype = {
    
    datatype    : null,
    resource    : null,
    property    : null,
    content     : null,
    about       : null,
    type        : null,
    href        : null,
    src         : null,
    rel         : null,
    rev         : null
};

/**
 * [static] Index element attributes.
 * @param {Element} element
 * @return {RDFattributes}
 */
rdf.RDFattributes.index = function ( element ) {
    
    var atts = new rdf.RDFattributes ();
    for ( var prop in rdf.RDFattributes.prototype ) {
        var att = element.attributes [ prop === "type" ? "typeof" : prop ];
        if ( att && att.specified ) {
            atts [ prop ] = att.nodeValue;
        }
    }
    if ( atts.rel && atts.rel === "stylesheet" ) {
        atts.rel = null; // TODO: how to react on this?
    }
    return atts;
};


// RDFaCrawler  ..............................................................

/**
 * Resolve RDF attributes in eleven easy steps.
 * @param {Document} doc
 * @param {RDFDatasource} ds
 */
rdf.RDFaCrawler = function ( doc, ds ) {
    
    this._document = doc;
    this._datasource = ds;
};

rdf.RDFaCrawler.prototype = {
    
    /**
     * RDFa annotated document.
     * @type {Document}
     */
    _document : null,
    
    /**
     * RDF datasource.
     * @type {RDFDatasource}
     */
    _datasource : null,
    
    /**
     * Start indexing. 
     */
    go : function () {
        
        var base = this._document.URL;
        var context =  new rdf.RDFaContext ( base, base, null, {}, null, null );
        
        this._datasource.batchBegin ();
        this._crawl ( this._document.documentElement, context );
        this._datasource.batchEnd ();
    },
    
    /**
     * Crawl element recursively.
     * @param {Element} element
     * @param {RDFaContext} context
     */
    _crawl : function ( element, context ) {
        
        context = this._index ( element, context );
        
        if ( element.hasChildNodes ()) {
            var node = element.firstChild;
            while ( node !== null ) {
                if ( node.nodeType === Node.ELEMENT_NODE ) {
                    this._crawl ( node, context );
                }
                node = node.nextSibling;
            }
        }
    },
    
    /**
     * Index element. 
     * @see http://www.w3.org/TR/rdfa-syntax/#sec_5.5
     * @param {Element} element
     * @param {RDFaContext} context
     * @returns {{RDFaContext}
     */
    _index : function ( element, context ) {
        
        // 0: Read RDF attributes.
        
        var atts = new rdf.RDFattributes.index ( element );
        
        // 1: Init current iteration.
        
        var cont = true,             // [recurse] 
            skip = false,            // [skip_element]
            suri = null,             // [new subject]
            ouri = null,             // [current object resource]
            uris = context.uris,     // [local list of URI mappings]
            list = null,             // [local list of incomplete triples]
            lang = context.lang;     // [current language]
        
        // 2: Scan for [URI mappings].
        
        if ( document.all ) { // xmlns attributes hidden for IE
            var html = element.outerHTML;
            if ( html.indexOf ( "xmlns:" ) >-1 ) {
                html = html.split ( ">" )[ 0 ];
                html = html.replace ( / = /g, "=" );
                html.split ( " " ).forEach ( function ( cut ) {
                    if ( cut.indexOf ( "xmlns:" ) >-1 ) {
                        cut = cut.split ( "=" );
                        var l = cut [ 0 ];
                        var r = cut [ 1 ];
                        var p = l.split ( ":" )[ 1 ];
                        uris [ p ] = r.replace ( /\"/g, "" );
                    }
                });
            }
        } else {
            Array.forEach ( element.attributes, function ( att ) {
                var name = att.nodeName;
                if ( name.indexOf ( "xmlns:" ) >-1 ) {
                    var prefix = name.split ( ":" )[ 1 ];
                    uris [ prefix ] = att.nodeValue;
                }
            }, this );
        }
        
        // 3: TODO: Scan for [current language] info.
        
        // 4: If not @rel or @rev, find [new subject]
        
        if ( !atts.rel && !atts.rev ) {
            [ atts.about, atts.src, atts.resource, atts.href ].every ( function ( att ) {
                if ( att !== null ) {
                    suri = att;
                }
                return suri === null;
            });
            
        // 5: If @rel or @rev, find [new subject] and [current object resource]:
            
        } else {
            
            suri = atts.about ? atts.about : atts.src;
            ouri = atts.resource ? atts.resource : atts.href;
        }
        
        // 4 and 5: Some stuff repeated for both steps if [new subject] was not found...
        
        if ( suri === null ) {
            switch ( element.nodeName.toLowerCase ()) {
                case "head" :
                case "body" :
                    // ?
                    break;
            }
            if ( atts.type ) {
                suri = rdf.RDFService.generateID ();
            } else {
                suri = context.ouri;
                if ( !atts.rel && !atts.rev ) {
                    skip = atts.property === null;
                }
            }
        }
        
        // 6: if [new subject] was found, use it to declare RDF types.
        
        if ( suri !== null ) {
            if ( atts.type ) {
                atts.type.split ( " " ).forEach ( function ( type ) {
                    var pre = rdf.NAMESPACEURI + "type";
                    this._resource ( suri, pre, this._qualify ( type, uris ));
                }, this );
            }
        }
        
        // 7: If [current object resource] was found, use it to generate triples
        
        if ( ouri !== null ) {
            if ( atts.rel ) {
                atts.rel.split ( " " ).forEach ( function ( rel ) {
                    var pre = this._qualify ( rel, uris );
                    this._resource ( suri, pre, ouri );
                }, this );
            }
            if ( atts.rev ) {
                atts.rev.split ( " " ).forEach ( function ( rev ) {
                    var pre = this._qualify ( rev, uris );
                    this._resource ( ouri, pre, suri );
                }, this );
            }
            
        // 8. If [current object resource] was not found, but predicates exist, add 
        // new [incomplete triple]. Also set [current object resource] to blank node.
            
        } else if ( atts.rel || atts.rev ) {
            
            ouri = rdf.RDFService.generateID ();
            
            list = list ? list : [];
            if ( atts.rel ) {
                atts.rel.split ( " " ).forEach ( function ( rel ) {
                    var pre = this._qualify ( rel, uris );
                    list.push ( new rdf.RDFaTriple ( pre, "forward" ));
                }, this );
            }
            if ( atts.rev ) {
                atts.rev.split ( " " ).forEach ( function ( rev ) {
                    var pre = this._qualify ( rev, uris );
                    list.push ( new rdf.RDFaTriple ( pre, "reverse" ));
                }, this );
            }
        }
        
        // 9. Establish any [current object literal].

        if ( atts.property ) {
            
            if ( atts.datatype ) {
                
                // TODO: handle typed literal
                
            } else { // Candidate for plain literal?
                
                var is = false;
                if ( atts.content ) {
                    is = true;
                } else {
                    is = Array.every ( element.childNodes, function ( node ) {
                        return node.nodeType === Node.TEXT_NODE;
                    });
                }
                if ( !is ) {
                    is = !element.hasChildNodes ();
                }
                if ( !is && atts.datatype === "" ) {
                    is = element.hasChildNodes ();
                }
                if ( is ) {
                    var val = atts.content ? atts.content : null;
                    if ( !val ) {
                        val = element.textContent ? element.textContent : ( element.text ? element.text : element.innerText );
                    }
                    if ( lang ) {
                        // TODO: include lang info as prescribed in http://www.w3.org/TR/rdf-concepts/
                    }
                    if ( val ) {
                        atts.property.split ( " " ).forEach ( function ( prop ) {
                            prop = this._qualify ( prop, uris );
                            this._literal ( suri, prop, val.trim ());
                        }, this );
                    }
                } else {
                    // TODO: Handle XML literals (remember recurse false)
                }
            }
        }
        
        // 10. if [new subject] was found, resolve [incomplete triple]s from previous iteration.
        
        if ( !skip && suri !== null ) {
            if ( context.list ) {
                context.list.forEach ( function ( triple ) {
                    switch ( triple.direction ) {
                        case "forward" :
                            this._resource ( context.suri, triple.predicate, suri );
                            break;
                        case "reverse" : 
                            this._resource ( suri, triple.predicate, context.suri );
                            break;
                        }
                }, this );
            }
        }
        
        /*
         * 11. Compute context for next level. 
         */
        if ( skip ) {
            context.list = list;                                // [list of incomplete triples]
            context.lang = lang;                                // [language]
        } else {
            context = new rdf.RDFaContext ( 
                context.base,                                   // [base]
                suri ? suri : context.suri,                     // [parent subject]
                ouri ? ouri : ( suri ? suri : context.suri ),   // [parent object]
                uris,                                           // [list of URI mappings]
                list,                                           // [list of incomplete triples]
                lang                                            // [language]
            );
        }
            
        return context;
    },
    
    /**
     * Replace prefix with namespace, if nescessary.
     * @param {String} att
     * @param {Map<String,String>} uris
     * @return {String}
     */
    _qualify : function ( att, uris ) {
       
        if ( !rdf.RDFaAssistant.looksURI ( att )) {
            var split = att.split ( ":" );
            var fx = split [ 0 ];
            var ns = uris [ fx ];
            var id = split [ 1 ];
            att = ( ns ? ns : "http://www.undefined.org#" ) + ( id ? id : att );
        } 
        return att;
    },
    
    /**
     * Generate triple with resource object.
     * @param {String} sub
     * @param {String} pre
     * @param {String} obj
     */
    _resource : function ( sub, pre, obj ) {
        
        this._datasource.assert ( 
            rdf.RDFService.getResource ( sub ),
            rdf.RDFService.getResource ( pre ),
            rdf.RDFService.getResource ( obj )
        );
    },
    
    /**
     * Generate triple with literal object.
     * @param {String} sub
     * @param {String} pre
     * @param {String} obj
     */
    _literal : function ( sub, pre, obj ) {
        
        this._datasource.assert (
            rdf.RDFService.getResource ( sub ),
            rdf.RDFService.getResource ( pre ),
            rdf.RDFService.getLiteral ( obj )
        );
    }
};