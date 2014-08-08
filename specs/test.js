//
// Test the ESI proxy
//

var ESI = require('../src/esi.js');

var ESIConnect = require('../index.js');

var expect = require('expect.js');


//
// SETUP DUMMY SERVER
// This reproduces a third party OAuth and API Server
//

var connect = require('connect');
var http = require('http');

var request = require('supertest');

var test_port = 3334,
	localhost = "http://localhost:"+test_port+"/";


describe("ESI", function(){



	var srv, test;


	before(function(){

		// The test server merely writes out the the GET path in the body of the response
		// This makes testing easier, since each test can effectively mock its own environment

		test = connect()
			.use( ESIConnect )
			.use( function( req, res ){
				// Check if the request URL is returning a number?
				var m;
				if( ( m = req.url.match(/^\/(\d+)$/) ) ){
					res.writeHead(parseInt(m[1],10),{});
				}
				res.write( decodeURIComponent(req.url).replace(/^\/|\/$/g,'') );
				res.end();
			});

		srv = http.createServer(test).listen(test_port);
	});

	after(function(){
		srv.close();
	});


	it("should return a promise object", function(){
		var esi = ESI('text');
		expect( esi ).to.have.property( 'then' );
	});

	it("should not affect regular content", function(done){
		var str = 'text';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( str );
			done();
		});
	});

	it("should process open and closed tags, i.e. <esi:tag/> and <esi:tag></esi:tag>", function(done){
		var str = '<esi:comment/><esi:comment a/><esi:comment a />ok<esi:comment>removed</esi:other></esi:comment>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});





describe("esi:assign, esi:vars and $(key)", function(){

	it("should esi:assign a value to be used in ESI fragments", function(done){

		var str = "<esi:assign name='test' value='quote\\'s'/>";
		str += "<esi:vars>$(test)</esi:vars>";

		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'quote\\\'s' );
			done();
		});
	});

	it("should return the value of items defined in an esi:vars `name` attribute", function(done){

		var str = "<esi:assign name='test' value='output'/>";
		str += "<esi:vars name=$(test)/>";

		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'output' );
			done();
		});
	});

	it("should return nothing when unable to to match the variables", function(done){

		var str = "<esi:assign name='test' value='output'/>";
		str += "<esi:vars name=$(test{1})/>";

		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( '' );
			done();
		});
	});
});




describe("esi:include", function(){


	it("should be replaced with the resource defined in the `src` attribute", function(done){
		var str = '<esi:include src="'+ localhost +'text"/>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'text' );
			done();
		});
	});

	it("should work indendently and handle multiple queries simultaneiously", function(done){
		var str = '<esi:include ignore src="'+ localhost +'text1" ignorethis>\n ignore this\n </esi:include>, <esi:include ignoreme src="'+ localhost +'text2"></esi:include>,<esi:include src="'+ localhost +'text3"></esi:include>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'text1, text2,text3' );
			done();
		});
	});

	it("should process ESI VARS in the `src` attribute", function(done){
		var str = '<esi:assign name="server" value="'+ localhost +'"/><esi:include src="$(server)ok"/>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});

	it("should use the `alt` attributes if the `src` returns an error status", function(done){
		var str = '<esi:include src="'+ localhost + 404 + '" alt="' + localhost + 'ok"/>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});

	it("should process ESI VARS in the `alt` attribute", function(done){
		var str = '<esi:assign name="server" value="'+ localhost +'"/><esi:include src="$(server)404" alt="$(server)ok"/>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});


	it("should not return the ESI fragment if it can't honor the request", function(done){

		var str = '<esi:include src="'+ localhost + 404 + '"></esi:include>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( '' );
			done();
		});
	});
});





describe("esi:remove", function(){

	it("should remove the esi:remove block from the text", function(done){
		var str = '<esi:remove> not </esi:remove>ok';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});

});




describe("<!--esi --> comment tag", function(){

	it("should clip the esi comments tags from around the text inside", function(done){
		var str = 'should<!--esi always -->appear';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'should always appear' );
			done();
		});
	});


	it("should process the ESI content within the esi comment tag, e.g esi:* and $(key)", function(done){
		var str = 'should<!--esi <esi:assign name=key value=always/>$(key) -->appear';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'should always appear' );
			done();
		});
	});

});



describe("esi:text", function(){

	it("should not render the content within an esi:text block", function(done){
		var text = "$(document)<esi:comment>This would normally get stripped</esi:comment>";
		var str = '<esi:assign name="document" value="ok"/>'+text+'<esi:text>'+text+'</esi:text>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' + text );
			done();
		});
	});

});



// Conditional Blocks


describe("esi:choose", function(){

	describe("should render esi:when block when its attribute `test` is truthy", function(){

		[
			'$(HTTP_HOST) == localhost',
			'$(HTTP_HOST)',
			"$(HTTP_HOST) matches '''^local.*''' ",
			"$(HTTP_HOST) has local",
			"$(HTTP_HOST) != remote"
		].forEach(function(test){

			it("true: " + test, function(done){

				var str = '<esi:choose><esi:when test="'+ test +'">ok</esi:when><esi:otherwise>fail</esi:otherwise></esi:choose>';
				var esi = ESI( str, null, {
					HTTP_HOST : 'localhost'
				} );
				esi.then(function( response ){
					expect( response ).to.be.eql( 'ok' );
					done();
				});
			});
		});

	});

	describe("should render esi:otherwise block when previous esi:when tests are falsy", function(){

		[
			'$(unknown)',
			'!$(HTTP_HOST)',
			'$(HTTP_HOST) == remote'
		].forEach(function(test){

			it("false: " + test, function(done){

				var str = '<esi:choose><esi:when test="'+ test +'">fail</esi:when><esi:otherwise>ok</esi:otherwise></esi:choose>';
				var esi = ESI( str, null, {
					HTTP_HOST : 'localhost'
				} );
				esi.then(function( response ){
					expect( response ).to.be.eql( 'ok' );
					done();
				});
			});
		});
	});

	describe("esi:when", function(){

		it("should assign the matches to $(MATCHES{1})", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'">$(MATCHES{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			esi.then(function( response ){
				expect( response ).to.be.eql( 'ok' );
				done();
			});
		});



		it("should assign the matches to the value of the `matchname` attribute", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'" matchname=pathvars>$(pathvars{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			esi.then(function( response ){
				expect( response ).to.be.eql( 'ok' );
				done();
			});
		});
	});
});

});





describe("ESI via webserver", function(){

	var test, srv;

	// Choose another test port
	beforeEach(function(){

		// The test server merely writes out the the GET path in the body of the response
		// This makes testing easier, since each test can effectively mock its own environment

		test = connect()
			.use( ESIConnect )
			.use( function( req, res ){
				// Check if the request URL is returning a number?
				var m;
				if( ( m = req.url.match(/^\/(\d+)$/) ) ){
					res.writeHead(parseInt(m[1],10),{});
				}
				res.write( decodeURIComponent(req.url).replace(/^\/|\/$/g,'') );
				res.end();
			});

		srv = http.createServer(test).listen(test_port);
	});

	afterEach(function(){
		srv.close();
	});



	it("should pass through non-esi text", function(done){

		request(test)
			.get('/ok')
			.expect(200, 'ok')
			.end(done);
	});


	it("should process ESI markup", function(done){

		var resolve = 'hello';
		var snipet = '<esi:include src="'+ localhost + resolve +'"/>'+resolve;

		request(test)
			.get('/'+(snipet))
			.expect(200, resolve + resolve)
			.end(done);
	});


	it("should let us define esi.vars.custom_name", function(done){

		// Assign a custom variable
		ESIConnect.vars.custom = 'ok';

		var snipet = '<esi:vars>$(custom)</esi:vars>';

		request(test)
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

				request(test)
					.get('/'+(snipet)+'?test=ok')
					.set('cookie', 'biscuit=word;')
					.expect(200, /.+/ )
					.end(done);
			});

		});
	});


});