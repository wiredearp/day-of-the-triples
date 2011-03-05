/*
 * Upgrade antiquated browsers with selected features of Javascript 1.6 and up.  
 */

// DOM2 Node interface
if ( window.Node === undefined ) {
    window.Node = {
        ELEMENT_NODE : 1, 
        TEXT_NODE : 3, 
        DOCUMENT_NODE : 9 
    };
}

// String.prototype.trim
if ( String.prototype.trim === undefined ) {
    String.prototype.trim = function () {
        "use strict";
        return this.replace ( /^\s*/, "" ).replace ( /\s*$/, "" );
    };
}

// Array.every
if ( Array.every === undefined ) {
    Array.every = function ( array, fun ) {
        "use strict";
        var result = true;
        var len = array.length >>> 0;
        if ( typeof fun != "function" ) {
            throw new TypeError ();
        } else {
            var thisp = arguments [ 2 ];
            for ( var i = 0; i < len; i++ ) {
                if ( array [ i ] !== undefined ) {
                    if ( !fun.call ( thisp, array [ i ], i, array )) {
                        result = false;
                        break;
                    }
                }
            }
        }
        return result;
    };
}
   
// Array.prototype.every
if ( Array.prototype.every === undefined ) {
    Array.prototype.every = function ( fun ) {
        "use strict";
        var thisp = arguments [ 1 ];
        return Array.every ( this, fun, thisp );
    }; 
}

// Array.forEeach
if ( Array.forEach === undefined ) {
    Array.forEach = function ( array, fun ) {
        "use strict";
        var len = array.length >>> 0;
        if ( typeof fun != "function" ) {
            throw new TypeError ();
        } else {
            var thisp = arguments [ 2 ];
            for ( var i = 0; i < len; i++ ) {
                if ( array [ i ] !== undefined ) {
                    fun.call ( thisp, array [ i ], i, array );
                }
            }
        }
    };
}
   
// Array.prototype.forEach
if ( Array.prototype.forEach === undefined ) {
    Array.prototype.forEach = function ( fun ) {
        "use strict";
        var thisp = arguments [ 1 ];
        Array.forEach ( this, fun, thisp );
    }; 
}
   
// Array.prototype.indexOf
if ( Array.prototype.indexOf === undefined ) {
    Array.prototype.indexOf = function ( elt ) {
        "use strict";
        var result = -1;
        var len = this.length >>> 0;
        var from = Number ( arguments [ 1 ]) || 0;
        from = ( from < 0 ) ? Math.ceil ( from ) : Math.floor ( from );
        if (from < 0 ) {
            from += len;
        }
        for ( ; from < len; from++ ) {
          if ( from in this && this [ from ] === elt ) {
              result = from;
          }
        }
        return result;
  };
}