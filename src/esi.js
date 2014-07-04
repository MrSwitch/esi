//
// ESI
//

var Promise = require('promise');

var http = require('http');



var reg_esi_tags = /<(esi\:include)\s([^>]+)>([\s\S]*?)<\/\1>/ig,
	reg_esi_tag_split = /<esi\:include\s[^>]+>[\s\S]*?<\/esi\:include>/ig,
	reg_esi_tag = /<(esi\:include)\s([^>]+)>([\s\S]*?)<\/\1>/i;


module.exports = function ESI( body, encoding ){

	// Format incoming

	if( typeof (body) !== 'string' ){
		body = (body || '').toString();
	}


	// Create a series of Promise object

	var tag_promises = [];


	// Find matches in the body which contain the ESI fragment

	var tags = body.match(reg_esi_tags) || [];


	// Split the current string into parts

	var parts = body.split(reg_esi_tag_split);


	// Loop through and process each of the ESI fragments

	tags.forEach(function(str){


		// Get Tag Attributes in an object

		var m = str.match(reg_esi_tag);

		var attrs = getAttributes(m[2]);


		// Create a new Promise object for this tag and add it to the Promise Array
		tag_promises.push( new Promise(function(resolve, reject){

			if( !attrs.src ){

				// Urgh this should have contained a src attibute
				// Just spit it back
				resolve(str);
				return;

			}

			http.get( attrs.src, function(res){

				var body='';

				res.on('data', function(buffer){
					body += buffer;
				});

				res.on('end', function(){

					// Check whether the response also contains ESI fragments

					var esi = ESI( body, encoding );

					// resolve this Promise with the response from the server
					esi.then(resolve);

				});


			});

		}));

	});



	// Create the mother of all promises, to process all the child operations into a single resolve.
	
	return Promise.all(tag_promises).then(function(response){

		// Once all these have returned we can replace the parts of the body with the ESI fragments
		var r = [];

		for(var i=0; i < parts.length; i++){
			// One from parts
			r.push(parts[i]);
			// The other from
			if(i in response){
				r.push(response[i]||'');
			}
		}

		return r.join('');
	});
};


// getAttributes

var reg_attrs = /\b([^\s=]+)(=(('|")(.*?)(\4)|[^\s]+))?/ig;

function getAttributes(str){

	var m,r={};
	while((m = reg_attrs.exec(str))){
		r[m[1]] = m[5] || m[3];
	}

	return r;
}