//
// ESI
//

var Promise = require('promise');

var http = require('http');



var reg_esi_tag_split = /(<esi\:include\s[^>]+>[\s\S]*?<\/esi\:include>)/ig;


module.exports = ESI;



// The main point of entry
// Given an body of text, break it down into strings and Promise objects
// @return Promise

function ESI( body, encoding ){

	// Format incoming

	if( typeof (body) !== 'string' ){
		body = (body || '').toString();
	}

	// Split the current string into parts, some including the ESI fragment and then the bits in between
	// Loop through and process each of the ESI fragments, mapping them back to a parts array containing strings and the Promise objects

	var parts = body.split( reg_esi_tag_split ).map( processESITags );



	// Create the mother of all promises, to process all the child operations into a single resolve.
	
	return Promise.all(parts).then(function(response){

		// Once all these have returned we can merge the parts together
		return response.join('');
	});
}





var reg_esi_tag = /<(esi\:include)\s([^>]+)>([\s\S]*?)<\/\1>/i;


// Process ESI tags
// Given a section of the body string, if it is a esi tag process it and return a Promise object, otherwise return a string.

function processESITags(str){


	// Get Tag Attributes in an object

	var m = str.match(reg_esi_tag);


	// Is this a tag?
	if( !m ){
		// nope, spit it back...
		return str;
	}


	var attrs = getAttributes(m[2]);


	if( !attrs.src ){

		// Urgh this should have contained a src attibute
		// Just spit it back, its not in a correct format
		return str;
	}


	// Replace the section with a new Promise object for this tag and add it to the Promise Array
	return new Promise(function(resolve, reject){

		http.get( attrs.src, function(res){

			var body='';

			res.on('data', function(buffer){
				body += buffer;
			});

			res.on('end', function(){

				// Check whether the response also contains ESI fragments

				var esi = ESI( body );

				// resolve this Promise with the response from the server
				esi.then(resolve);

			});


		});

	});

}



// getAttributes

var reg_attrs = /\b([^\s=]+)(=(('|")(.*?)(\4)|[^\s]+))?/ig;

function getAttributes(str){

	var m,r={};
	while((m = reg_attrs.exec(str))){
		r[m[1]] = m[5] || m[3];
	}

	return r;
}