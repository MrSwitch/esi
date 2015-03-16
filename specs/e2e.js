require('./helper');


var ESIConnect = require('../index.js');


//
// SETUP DUMMY SERVER
// This reproduces a third party OAuth and API Server
//

var connect = require('connect');
var http = require('http');
var request = require('supertest');

var test_port = 3001;




describe("ESI via webserver", function(){

	var testCDN,srvCDN;

	// Choose another test port
	before(function(done){

		// The test server merely writes out the the GET path in the body of the response
		// This makes testing easier, since each test can effectively mock its own environment

		testCDN = connect()
			.use( ESIConnect )
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

		srvCDN = http.createServer(testCDN).listen(test_port-10, done);
	});

	after(function(done){
		srvCDN.close();
		done();
	});


	it("should pass through non-esi text", function(done){

		request(testCDN)
			.get('/ok')
			.expect(200, 'ok')
			.end(done);
	});


	it("should process ESI markup", function(done){

		this.timeout(5000);

		var resolve = 'hello';
		var snipet = '<esi:include src="'+ localhost + resolve +'"/>'+resolve;

		request(testCDN)
			.get('/'+snipet)
			.expect(200, resolve + resolve)
			.end(done);
	});


	it("should let us define esi.vars.custom_name", function(done){

		// Assign a custom variable
		ESIConnect.vars.custom = 'ok';

		var snipet = '<esi:vars>$(custom)</esi:vars>';

		request(testCDN)
			.get('/'+snipet)
			.expect(200, 'ok' )
			.end(done);
	});


	describe("should assign default HTTP VARS", function(){

		[
			'HTTP_HOST',
			'HTTP_COOKIE',
			'HTTP_USER_AGENT',
			'HTTP_ACCEPT_ENCODING',

			'REQUEST_METHOD',
			'REQUEST_PATH',
			'QUERY_STRING',
		].forEach(function(vars){

			it(vars, function(done){
				var snipet = '<esi:vars>$('+vars+')</esi:vars>';

				request(testCDN)
					.get('/'+(snipet)+'?test=ok')
					.set('cookie', 'biscuit=word;')
					.expect(200, /.+/ )
					.end(done);
			});

		});
	});

});