//
// ESI: Edge Side Includes
// Apply to a Node HTTP server and format its output
//

var ESI = require('./src/esi.js');

var URL =  require('url');


//
// Extends the NodeJS service with an ESI shim to make requests before spitting stuff backout
// The function manipulates res.write and res.end function of a response object in NodeJS
//
module.exports = function( req, res, next ){

	// Set debug level in module
	ESI.debug = module.exports.debug;

	// Define the VARS which will be passed
	var VARS = get_http_vars( req );

	// Override with any custom variables
	if( module.exports.vars ){
		for( var x in module.exports.vars ){
			VARS[x] = module.exports.vars[x];
		}
	}


	// Store the original, write and end functions

	var original_write = res.write,
		original_end = res.end;


	// Output
	// pending actions awaiting a response

	var output = [], pending, ended;

	function flush_output(){

		// Can't call this if we're waiting for an sync option to complete

		if( pending ){
			return;
		}


		// Mark as pending

		pending = true;


		// Loop through the pending list

		if(output.length){

			var item = output[0];
			var esi = item[0];
			var encoding = item[1];

			esi.then( null, function(e){

				// on error
				// Write nothing out
				return '';

			}).then( function( r ){

				// Write this out
				original_write.call( res, r, encoding );

				// Remove item from the start of the array
				output.shift();

				// Mark pending as stopped
				pending = false;

				// Determine whats in the queue
				flush_output();

			});
		}


		// The user has ended the response and the flush has been cleared away
		if( ended && output.length === 0 ){

			original_end.call( res );

		}
	}


	// Overwrite the write function

	res.write = function( chunk, encoding ){

		if( !chunk ){
			// dont do anything
			return;
		}

		// remove the res header

		if(!res.headersSent)
			res.removeHeader('content-length');

		// Does this have an ESI fragment
		var esi = ESI( chunk, encoding, VARS, false );


		// Push the request into a queue

		output.push( [ esi, encoding ] );


		// Once the item is resolved then we can flush the queue
		esi.then(flush_output);

	};


	// Overwrite the end function

	res.end = function( data, encoding ){

		ended = true;

		// resuse overriden res.write
		res.write( data, encoding );

	};


	// If this is a Connect-ish application

	if(next){
		next();
	}

};


// Placeholder for custom vars
module.exports.vars = {};


//
// Return
// Pass in variables into ESI which identifies the request
//
function get_http_vars(req){
	var http_vars = {};
	for(var x in req.headers ){
		http_vars[ "HTTP_" + x.replace(/\-/g,'_').toUpperCase() ] = req.headers[x];
	}

	// Extract the HTTP request
	var url = URL.parse( req.url );
	http_vars.REQUEST_PATH = url.pathname;
	http_vars.QUERY_STRING = url.query;


	http_vars.REQUEST_METHOD = req.method;

	return http_vars;
}
