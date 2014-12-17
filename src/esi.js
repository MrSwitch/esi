//
// ESI
//

// This is already a part of the global
var Promise = require('promise');

var http = require('http');



var reg_esi_tag = /<(esi\:[a-z]+)\b([^>]+[^\/>])?(?:\/|>([\s\S]*?)<\/\1)>/i;
var reg_esi_comments = /<\!--esi\b([\s\S]*?)-->/gi;

module.exports = ESI;



// The main point of entry
// Given an body of text, break it down into strings and Promise objects
// @return Promise

function ESI( body, encoding, VARS ){

	// Format incoming

	if( typeof (body) !== 'string' ){
		body = (body || '').toString();
	}


	// Trim any <!--esi --> comment tags off
	body = body.replace(reg_esi_comments, '<esi:vars>$1</esi:vars>');



	// Split the current string into parts, some including the ESI fragment and then the bits in between
	// Loop through and process each of the ESI fragments, mapping them back to a parts array containing strings and the Promise objects

	var parts = splitText( body ).map( processESITags.bind(VARS) );



	// Create the mother of all promises, to process all the child operations into a single resolve.
	
	return Promise.all(parts).then(function(response){

		// Once all these have returned we can merge the parts together
		return response.join('');
	});
}




// Process ESI tags
// Given a section of the body string, if it is a esi tag process it and return a Promise object, otherwise return a string.

function processESITags(str){

	// Get Tag Attributes in an object

	var m = str.match(reg_esi_tag);


	// Is this a tag?
	if( !m ){
		// Are there any items in here which are in the local dictionary
		// Do a quick dictionary replace and spit it back
		return DictionaryReplace( str, this );
	}


	// Reference the different parts of the node

	var tag = m[1];
	var attrs = getAttributes(m[2]);
	var body = m[3];



	switch(tag){

		// Replaces the content
		case 'esi:include':
			return processESIInclude( attrs, body, this );

		// Replaces the content
		case 'esi:try':
			return processESITry( body, this );

		// Apply variables to the block
		case 'esi:vars':
			return processESIVars( attrs, body, this );

		// Call the esi:choose as a block
		case 'esi:choose':
			// ESI
			var r = ESI( body, null, this );

			// RESET MATCHES
			if( this.hasOwnProperty('MATCHES') ){
				delete this.MATCHES;
			}
			return r;

		// Check
		case 'esi:when':
			// Has the matches already returned a result?
			if( !this.hasOwnProperty('MATCHES') ){
				// Run the test

				var result = processESICondition( attrs.test, this );
				if( result ){
					// Store the result into a variable called matches
					// This is used to infer that a match was successful
					this.MATCHES = result;

					// Has a label been assigned to the MATCHES
					if( attrs.matchname ){
						this[ attrs.matchname ] = result;
					}

					log( log.INFO, 'esi:when', attrs.test );

					// Execute this block of code
					return ESI( body, null, this );
				}
			}
			// Otherwise lets not include this block in the response
			return '';

		case 'esi:otherwise':

			// Has the previous esi:when condition already matched?
			if( this.hasOwnProperty('MATCHES') ){
				return '';
			}

			log( log.INFO, 'esi:otherwise' );

			// Otherwise, process the esi:otherwise block
			return ESI( body, null, this );

		case 'esi:assign':

			log( log.INFO, 'esi:assign', attrs.name + ' = ' + attrs.value );

			// Add to the dictionary
			this[attrs.name] = processESIExpression( attrs.value, this );

			return '';

		case 'esi:text':

			return body;

		case 'esi:comment':
		case 'esi:remove':
			// All else, return empty string...
			log( log.INFO, tag, 'expunged' );
			return '';
	}

	// Warn
	log( log.WARN, tag, 'unrecognised' );

	// All else, return empty string...
	return str;
}



//
// Process ESI include
//

function processESIInclude(attrs, body, VARS){


	// Clone the VARS
	// Set the prototype
	VARS = Object.create(VARS||{});


	if( !attrs.src ){

		// Urgh this should have contained a src attibute
		// Just spit it back, its not in a correct format
		log( log.FAIL, 'esi:include', 'Missing src attribute' );
		return '';
	}

	// Set the src
	var src = attrs.src;

	// Replace the section with a new Promise object for this tag and add it to the Promise Array

	return new Promise(function( resolve, reject ){

		// Make request
		src = DictionaryReplace( attrs.src, VARS );

		makeRequest( src, resolve, reject );

	})

	// If this fails, check for an alt attribute
	.then(
		null,
		function( err ){

			// The response returned a responseState greater than 400
			// Is there an alternative path?

			if( attrs.alt ){

				log( log.WARN, 'esi:include', err );

				// Make the request again

				return new Promise( function( resolve, reject ){

					src = DictionaryReplace( attrs.alt, VARS );

					makeRequest( src, resolve, reject );

				});
			}

			// Nope continue with error
			throw err;
		}
	)

	// If all else fails
	.then(function(body){

			log( log.INFO, 'esi:include', src );

			// Run the Response back through ESI?
			if(attrs.dca === 'esi'){
				return ESI( body, null, VARS );
			}
			else {
				return body;
			}

		},
		function(err){

			// The response returned a responseState greater than 400
			log( log.FAIL, 'esi:include', err );

			if( attrs.onerror === "continue" ){
				// return an empty string
				return '';
			}
			else{
				throw err;
			}
		}
	);
}


//
// Run the contents of the ESI attempt block
//

function processESITry( body, VARS ){

	// Seperate out the contents of the esi:try block to be esi:attempt and esi:except

	var parts = splitText( body ),
		attempt,
		except;


	// Process the contents of the ESI block, matching the esi:attempt and esi:except blocks

	for(var i=0;i<parts.length;i++){

		var str = parts[i];
		var m = str.match(reg_esi_tag);
		var tag = m && m[1];

		if( tag === 'esi:attempt' ){
			attempt = m[3];
		}
		else if ( tag === 'esi:except' ){
			except = m[3];
		}
	}


	// Log
	log( log.INFO, 'esi:attempt' );

	// Run through esi processing

	return ESI( attempt, null, VARS ).then( null, function(){

		log( log.WARN, 'esi:except' );

		// Should that fail, return the except
		return ESI( except, null, VARS );

	});

}




// Process ESI Vars

function processESIVars(attrs, body, VARS){

	log( log.INFO, 'esi:vars' );

	if( !body && attrs.name ){
		return DictionaryReplace( attrs.name, VARS );
	}

	return ESI(body, null, VARS);
}



// Process a conditiional test
var reg_trim = /(^\s+|\s+$)/;
var reg_esi_condition = /^(.*?)\s+(=|==|<=|>=|matches|matches_i|has|has_i)\s+('''|)(.*?)\3$/;
var reg_esi_condition_separator = /\s+(\|\||\&\&)\s+/g;

function processESICondition( test, VARS ){

	// There can be mmultiple tests
	var tests = test.split(reg_esi_condition_separator);
	var bool, matches;

	for ( var i=0; i< tests.length; i++ ){

		// Trim white spaces
		test = tests[i].replace(reg_trim,'');


		// Logical operator
		if( test === '&&' && bool === false ){
			break;
		}
		else if ( test === '||' && bool === true ){
			break;
		}


		// Does it have a negatory operator
		var negatory = test[0] === '!';
		test.replace(/^\!/,'');

		// Match
		var m = test.match(reg_esi_condition);

		// Boolean condition
		if( !m ){

			bool = !!DictionaryReplace( test, VARS );
		}
		else{

			// Comparison Operators
			var a = DictionaryReplace( m[1], VARS );
			var operator = m[2];
			var b = DictionaryReplace( m[4], VARS );

			// Compare the two
			switch(operator){
				case '=':
				case '==':
				case '===':
					bool = a === b;
					break;
				case '!=':
				case '!==':
					bool = a !== b;
					break;
				case '>=':
					bool = a >= b;
					break;
				case '<=':
					bool = a <= b;
					break;
				case 'has':
					bool = a.indexOf(b) > -1;
					break;
				case 'has_i':
					bool = a.toLowerCase().indexOf(b.toLowerCase()) > -1;
					break;
				case 'matches':
				case 'matches_i':

					var reg = new RegExp( b, operator === 'matches_i' ? 'i' : '' );
					matches = a.match(reg);
					bool = !!matches;
					break;
			}
		}

		// Is there a negatory operator
		bool = negatory ^ bool;
	}

	return bool ? matches || true : false;
}


// Process ESI Expression

function processESIExpression(txt, VARS){

	// Tidy
	if( !txt && txt.length === 0 ){
		return '';
	}
	else if(txt[0]==="'"){
		return txt.replace(/^\'|\'$/g,'');
	}

	return DictionaryReplace( txt, VARS );

}


// Make an HTTP request for a resource

function makeRequest( url, resolve, reject ){

	//log( log.INFO, url );

	// Get the resource

	http.get( url, function(res){

		var body='';

		// Reject the promise if the response Code is >= 400

		if(res.statusCode >= 400){

			reject( url );

			return;
		}


		// If not read the data and pass through ESI

		res.on('data', function(buffer){
			body += buffer;
		});

		res.on('end', function(){

			// Resolve the content
			resolve( body );

		});

	}).on('error', function(e){

		reject( url );
	});
}



var reg_esi_tag_global = new RegExp(reg_esi_tag.source, 'gi');

function splitText(str){

	var i=0,
		m,
		r=[];

	while( ( m = reg_esi_tag_global.exec(str) ) ){
		r.push(str.slice(i,m.index));
		i = m.index+m[0].length;
		r.push(m[0]);
	}
	r.push(str.slice(i,str.length));

	return r;
}





// getAttributes

var reg_attrs = /\b([^\s=]+)(=(('|")(.*?[^\\]|)\4|[^\s]+))?/ig;

function getAttributes(str, undefined){

	var m,r={};
	while((m = reg_attrs.exec(str))){
		r[m[1]] = ( m[5] !== undefined ? m[5] : m[3] );
	}

	return r;
}


//
// Dictionary replace
//
var reg_esi_variable = /\$\((.*?)(?:\{([\d\w]+)\})?\)/g;

function DictionaryReplace(str, hash){
	return str.replace( reg_esi_variable, function (m, key, subkey){
		if(key in hash){
			var val = hash[key];
			if( subkey ){
				val = val instanceof Object ? val[subkey] : '';
			}
			return val === undefined ? '' : val;
		}
		return '';
	});
}






// log

function log( state, label, value){

	if( module.exports.debug ){
		console.log( state, label, value !== undefined ? value : '' );
	}

}
(function(){

	var states = {
		'INFO' : 2,
		'FAIL' : 1,
		'WARN' : 4
	};
	for( var x in states ){
		var color = states[x];
		log[x] = "\x1B[33mESI\x1B[39m: \x1b[9"+color+"m%s\x1B[39m \x1b[3"+color+"m%s\x1B[39m";
	}

})();