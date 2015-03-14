// Set global 
global.ESI = require('../src/esi.js');
global.expect = require('expect.js');

// Set a local server to return
var connect = require('connect');
var http = require('http');
var test_port = 3100;
global.localhost = "http://localhost:"+test_port+"/";

var srv, test;


before(function(done){

	// The test server merely writes out the the GET path in the body of the response
	// This makes testing easier, since each test can effectively mock its own environment

	test = connect()
		.use( function( req, res ){
			// Check if the request URL is returning a number?
			var m;
			if( ( m = req.url.match(/^\/(\d+)$/) ) ){
				res.writeHead(parseInt(m[1],10),{});
			}
			var body = decodeURIComponent(req.url).replace(/^\/|\/$/g,'');
			res.write( body );
			res.end();
		});

	srv = http.createServer(test).listen( test_port, done);
});

after(function(done){
	srv.close();
	done();
});