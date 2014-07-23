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

var SUPER_TEST_HOST = /127.0.0.1:\d/;


describe("esi()", function(){

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
});



var srv, test;
var test_port = 3334,
	localhost = "http://localhost:"+test_port+"/";

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
});




describe("esi:include", function(){


	it("should replace the content defined by the src attribute of the esi:include tag", function(done){
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

});





describe("esi:remove", function(){

	it("should cut esi:remove tag and nested content from body", function(done){
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

			it(" " + test, function(done){

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
});





describe("ESI connect", function(){


	it("should pass through non-esi text", function(done){

		request(test)
			.get('/hello')
			.expect(200, 'hello')
			.end(done);
	});


	it("should process esi:include tags", function(done){

		var resolve = 'hello';
		var snipet = '<esi:include src="'+ localhost + resolve +'"/>'+resolve;

		request(test)
			.get('/'+(snipet))
			.expect(200, resolve + resolve)
			.end(done);
	});


	it("should pass through HTTP VARS", function(done){

		var snipet = '<esi:include src="'+ localhost + '$(HTTP_HOST)"/>';

		request(test)
			.get('/'+(snipet))
			.expect(200, SUPER_TEST_HOST )
			.end(done);
	});

	it("should return the ESI fragment if it can't honor the request", function(done){

		var snipet = '<esi:include src="'+ localhost + 404 + '"></esi:include>';

		request(test)
			.get('/'+(snipet))
			.expect(200, snipet)
			.end(function(err, res){
				if (err) throw err;
				done();
			});
	});
});