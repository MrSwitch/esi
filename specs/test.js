//
// Test the ESI proxy
//

var ESI = require('../src/esi.js');

var expect = require('expect.js');


//
// SETUP DUMMY SERVER
// This reproduces a third party OAuth and API Server
//

var connect = require('connect');
var http = require('http');
var test_port = 3333;

var test = connect()
	.use( function( req, res ){
//		console.log( req.url );
		res.write( req.url );
		res.end();
	});

http.createServer(test).listen(test_port);


describe("ESI", function(){

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

	it("should follow the paths in an ESI tag", function(done){
		var str = '<esi:include src="http://localhost:3333/text"></esi:include>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( '/text' );
			done();
		});
	});

	it("should follow the paths in multiple ESI tags", function(done){
		var str = '<esi:include src="http://localhost:3333/text1"></esi:include>,<esi:include src="http://localhost:3333/text2"></esi:include>,<esi:include src="http://localhost:3333/text3"></esi:include>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( '/text1,/text2,/text3' );
			done();
		});
	});


});