//
// ESI
//

// This is already a part of the global
var Promise = require('promise');

var http = require('http');



var reg_esi_tag = /<(esi\:[a-z]+)\b([^>]+[^\/>])?(?:\/|>([\s\S]*?)<\/\1)>/i;
var reg_esi_comments = /<\!--esi\b([\s\S]*?)-->/gi;


module.exports = ESI;

// Expose functions
ESI.fn = {};
ESI.fn['esi:include'] = processESIInclude;
ESI.fn['esi:try']     = processESITry;
ESI.fn['esi:vars']    = processESIVars;
ESI.fn['esi:choose']  = processESIChoose;
ESI.fn['esi:when']    = processESIWhen;
ESI.fn['esi:otherwise']= processESIOtherwise;
ESI.fn['esi:assign']  = processESIAssign;
ESI.fn['esi:text']    = processESIText;
ESI.fn['esi:comment'] = processESIComment;
ESI.fn['esi:remove']  = processESIComment;

module.exports.request = request;


// The main point of entry
// Given an body of text, break it down into strings and Promise objects
// @return Promise

function ESI( body, encoding, scope ){

	scope = scope || {};

	// Does a parent Promise exist on this instance?
	if( !(this instanceof ESI) ){
		return new ESI(body, encoding, scope);
	}


	// Does a parent Promise exist on this instance?
	if( !this.promise ){

		log( log.INFO, 'Promise.resolve' );
		this.promise = Promise.resolve();
	}


	// Format incoming

	if( typeof (body) !== 'string' ){
		body = (body || '').toString();
	}


	// Trim any <!--esi --> comment tags off
	body = body.replace(reg_esi_comments, '<esi:vars>$1</esi:vars>');



	// Split the current string into parts, some including the ESI fragment and then the bits in between
	// Loop through and process each of the ESI fragments, mapping them back to a parts array containing strings and the Promise objects

	var parts = splitText( body ).map( processESITags.bind( this, scope ) );



	// Create the mother of all promises, to process all the child operations into a single resolve.
	
	return Promise.all(parts).then(function(response){

		// Once all these have returned we can merge the parts together
		return response.join('');
	});
}




// Process ESI tags
// Given a section of the body string, if it is a esi tag process it and return a Promise object, otherwise return a string.

function processESITags(scope, str){

	// Get Tag Attributes in an object

	var m = str.match(reg_esi_tag);


	// Is this a tag?
	if( !m ){
		// Are there any items in here which are in the local dictionary
		// Do a quick dictionary replace and spit it back
		return this.promise.then(function(){
			return DictionaryReplace( str, scope );
		});
	}


	// Reference the different parts of the node

	var tag = m[1];
	var attrs = getAttributes(m[2]);
	var body = m[3];

	if( tag in ESI.fn ){
		log( log.WARN, tag, JSON.stringify(attrs), JSON.stringify(scope) );
		return ESI.fn[tag].call( this, attrs, body, scope )
	}

	return str;
}



//
// Process ESI include
//

function processESIInclude(attrs, body, scope){

	var self = this;

	// Replace the section with a new Promise object for this tag and add it to the Promise Array

	return this.promise.then( function(){

		// Clone the scope
		// Set the prototype
		scope = Object.create(scope||{});


		if( !attrs.src ){

			// Urgh this should have contained a src attibute
			// Just spit it back, its not in a correct format
			log( log.FAIL, 'esi:include', 'Missing src attribute' );
			return '';
		}

		// Set the src
		var src = attrs.src;

		// Make request
		src = DictionaryReplace( attrs.src, scope );

		return fetch( src );
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
				src = DictionaryReplace( attrs.alt, scope );

				return fetch( src );
			}

			// Nope continue with error
			throw err;
		}
	)

	// If all else fails
	.then(function(body){

			log( log.INFO, 'esi:include', body );

			// Run the Response back through ESI?
			if(attrs.dca === 'esi'){
				return ESI.call( self, body, null, scope );
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

function processESITry( attrs, body, scope ){

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
	var self = this;

	return ESI.call( this, attempt, null, scope ).then( null, function(){

		log( log.WARN, 'esi:except' );

		// Should that fail, return the except
		return ESI.call( self, except, null, scope );

	});

}




// Process ESI Vars

function processESIVars(attrs, body, scope){

	var self = this;

	return this.promise.then(function(){

		log( log.INFO, 'esi:vars', JSON.stringify(scope) );

		if( !body && attrs.name ){
			return DictionaryReplace( attrs.name, scope );
		}

		return ESI.call(self, body, null, scope);
	});
}



function processESIChoose(attrs, body, scope){
	// ESI
	var r = ESI.call( this, body, null, scope ).then(function(r){
		// RESET MATCHES
		if( scope.hasOwnProperty('MATCHES') ){
			delete scope.MATCHES;
		}
		return r;
	});
	// RESET MATCHES
	if( scope.hasOwnProperty('MATCHES') ){
		delete scope.MATCHES;
	}
	return r;
}



function processESIWhen(attrs, body, scope){

	// Has the matches already returned a result?
	if( !scope.hasOwnProperty('MATCHES') ){
		// Run the test

		var result = processESICondition( attrs.test, scope );
		if( result ){
			// Store the result into a variable called matches
			// This is used to infer that a match was successful
			scope.MATCHES = result;

			// Has a label been assigned to the MATCHES
			if( attrs.matchname ){
				scope[ attrs.matchname ] = result;
			}

			log( log.INFO, 'esi:when', attrs.test );

			// Execute this block of code
			return ESI.call( this, body, null, scope );
		}
	}
	// Otherwise lets not include this block in the response
	return '';

}


function processESIOtherwise(attrs, body, scope){
	// Has the previous esi:when condition already matched?
	if( scope.hasOwnProperty('MATCHES') ){
		return '';
	}

	log( log.INFO, 'esi:otherwise' );

	// Otherwise, process the esi:otherwise block
	return ESI.call( this, body, null, scope );
}


function processESIAssign(attrs, body, scope){
	log( log.INFO, 'esi:assign', attrs.name + ' = ' + attrs.value );

	// Add to the dictionary
	scope[attrs.name] = processESIExpression( attrs.value, scope );

	return '';
}


function processESIText(attrs, body, scope){
	return body;
}


function processESIComment(attrs, body, scope){
	return '';
}


// Process a conditiional test
var reg_trim = /(^\s+|\s+$)/;
var reg_esi_condition = /^(.*?)\s+(=|==|<=|>=|matches|matches_i|has|has_i)\s+('''|)(.*?)\3$/;
var reg_esi_condition_separator = /\s+(\|\||\&\&)\s+/g;

function processESICondition( test, scope ){

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

			bool = !!DictionaryReplace( test, scope );
		}
		else{

			// Comparison Operators
			var a = DictionaryReplace( m[1], scope );
			var operator = m[2];
			var b = DictionaryReplace( m[4], scope );

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

function processESIExpression(txt, scope){

	// Tidy
	if( !txt && txt.length === 0 ){
		return '';
	}
	else if(txt[0]==="'"){
		return txt.replace(/^\'|\'$/g,'');
	}

	return DictionaryReplace( txt, scope );

}


// Make an HTTP request for a resource

function fetch( url ){

	var promise = new Promise(function( resolve, reject ){

		// Get the resource
		module.exports.request( url, function(err, res, body){

			if( err || res.statusCode >= 400 ){
				reject( url );
				return;
			}

			// Resolve the content
			resolve( body );
		});

	});

	return promise;
}


function request( url, callback ){

	http.get( url, function(res){

		var body='';

		// If not read the data and pass through ESI

		res.on('data', function(buffer){
			body += buffer;
		});

		res.on('end', function(){
			callback( null, res, body );
		});

	}).on('error', function(e){

		callback( e );
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