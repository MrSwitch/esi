//
// ESI
//

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


	// Inherit Dictionary of VARS
	VARS = Object.create(VARS||{});


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
			return processESIInclude( attrs, body, this, str);

		// Apply variables to the block
		case 'esi:vars':
			return processESIVars( attrs, body, this );


		case 'esi:assign':
			// Add to the dictionary
			this[attrs.name] = attrs.value;
			return '';

		case 'esi:comment':
		case 'esi:remove':
			// All else, return empty string...
			return '';
	}

	// All else, return empty string...
	return str;
}



//
// Process ESI include
//

function processESIInclude(attrs, body, VARS, str){


	if( !attrs.src ){

		// Urgh this should have contained a src attibute
		// Just spit it back, its not in a correct format
		return str;
	}

	// Replace the section with a new Promise object for this tag and add it to the Promise Array

	return new Promise(function( resolve, reject ){

		// Make request
		makeRequest( DictionaryReplace( attrs.src, VARS ), resolve, reject );

	})

	// If this fails, check for an alt attribute
	.then(
		null,
		function(){

			// The response returned a responseState greater than 400


			// Is there an alternative path?

			if( attrs.alt ){

				// Make the request again

				return new Promise( function( resolve, reject ){

					log( 'fallback', attrs.alt );

					makeRequest( DictionaryReplace( attrs.alt, VARS ), resolve, reject );

				});
			}
			else{

				log('error','Could not access '+attrs.src);

				return str;
			}
		}
	)

	// If all else fails
	.then(null,
		function(){

			// The response returned a responseState greater than 400
			log('error','Could not access '+attrs.src);

			// return the esi:tag as it was given, there is nowt to do
			return str;
		}
	);
}




// Process ESI Vars

function processESIVars(attrs, body, VARS){

	if( !body && attrs.name ){
		return DictionaryReplace( attrs.name, VARS );
	}

	return ESI(body, null, VARS);
}




// Make an HTTP request for a resource

function makeRequest( url, resolve, reject ){

	// Report

	log("request", url);


	// Get the resource

	http.get( url, function(res){

		var body='';

		// Reject the promise if the response Code is >= 400

		if(res.statusCode >= 400){

			log('error',res.statusCode);

			reject();

			return;
		}


		// If not read the data and pass through ESI

		res.on('data', function(buffer){
			body += buffer;
		});

		res.on('end', function(){

			// Check whether the response also contains ESI fragments

			var esi = ESI( body );

			// resolve this Promise with the response from the server
			esi.then(resolve);

		});

	}).on('error', function(e){
		reject();
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
function DictionaryReplace(str, hash){
	return str.replace(/\$\((.*?)\)/, function(m, key){
		if(key in hash){
			return hash[key];
		}
	});
}


// log

function log(label, value){

	if( module.exports.debug ){

		var color = label === 'error' ? 1 : 2;

		console.log("\x1B[33m%s\x1B[39m: \x1b[9"+color+"m%s\x1B[39m \x1b[3"+color+"m%s\x1B[39m", "esi", label, value);

	}
}