//
// Test the ESI proxy
//

var ESI = require('../src/esi.js');

var ESIConnect = require('../index.js');

var chai = require("chai");
var chaiAsPromised = require("chai-as-promised");

chai.use(chaiAsPromised);

var expect = chai.expect;


//
// SETUP DUMMY SERVER
// This reproduces a third party OAuth and API Server
//

var connect = require('connect');
var http = require('http');

var request = require('supertest');

var test_port = 3334,
	localhost = "http://localhost:"+test_port+"/";

var srv, test;


beforeEach(function(done){

	// The test server merely writes out the the GET path in the body of the response
	// This makes testing easier, since each test can effectively mock its own environment

	test = connect()
//			.use( ESIConnect )
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

	srv = http.createServer(test).listen(++test_port, done);
	localhost = "http://localhost:"+test_port+"/";

});

afterEach(function(done){
	srv.close();
	done();
});




describe("ESI", function(){



	it("should return a promise object", function(){
		var esi = ESI('text');
		expect( esi ).to.have.property( 'then' );
	});

	it("should not affect regular content", function(done){
		var str = 'text';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( str ).and.notify(done);
	});

	it("should process open and closed tags, i.e. <esi:tag/> and <esi:tag></esi:tag>", function(done){
		var str = '<esi:comment/><esi:comment a/><esi:comment a />ok<esi:comment>removed</esi:other></esi:comment>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});





describe("esi:assign, esi:vars and $(key)", function(){

	it("should esi:assign a value to be used in ESI fragments", function(done){

		var str = '<esi:assign name="test" value="\'quote\\\'s\'"/>';
		str += "<esi:vars>$(test)</esi:vars>";

		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'quote\\\'s' ).and.notify(done);
	});

	it("should return the value of items defined in an esi:vars `name` attribute", function(done){

		var str = '<esi:assign name="test" value="\'ok\'"/>';
		str += "<esi:vars name=$(test)/>";

		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should return nothing when unable to to match the variables", function(done){

		var str = '<esi:assign name="test" value="\'output\'"/>';
		str += "<esi:vars name=$(test{1})/>";

		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( '' ).and.notify(done);
	});
});


["include", "eval"].forEach(function (tagName) {

	var tag = "esi:"+tagName;

	describe(tag, function(){

		it("should be replaced with the resource defined in the `src` attribute", function(done){
			var str = '<' + tag + ' src="'+ localhost +'text"/>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'text' ).and.notify(done);
		});

		it("should work independently and handle multiple queries simultaneiously", function(done){
			var str = '<' + tag + ' ignore src="'+ localhost +'text1" ignorethis>\n ignore this\n </' + tag + '>, <' + tag + ' ignoreme src="'+ localhost +'text2"></' + tag + '>,<' + tag + ' src="'+ localhost +'text3"></' + tag + '>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'text1, text2,text3' ).and.notify(done);
		});

		it("should process ESI VARS in the `src` attribute", function(done){
			var str = '<esi:assign name="server" value="'+ localhost +'"/>' + '<' + tag + ' src="$(server)ok"/>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});

		if (tagName === 'include') {

			it("should use the `alt` attributes if the `src` returns an error status", function(done){
				var str = '<' + tag + ' src="'+ localhost + 404 + '" alt="' + localhost + 'ok"/>';
				var esi = ESI( str );
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
			});

		} else {

			it("should not support the use the of the `alt` attribute", function(done){
				var str = '<' + tag + ' src="'+ localhost + 404 + '" alt="' + localhost + 'ok"/>';
				var esi = ESI( str );
				expect(esi).to.eventually.be.rejectedWith(Error).and.notify(done);
			});

		}

		it("should inherit parent scope of the caller", function(done){
			var str = '';
			str += '<esi:assign name="test" value="ok" />';
			str += '<' + tag + ' src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});

		if (tagName === 'include') {

			it("should sandbox variables set in the response fragment", function(done){
				var str = '';
				str += '<esi:assign name="test" value="ok" />';
				str += '<' + tag + ' src="'+ localhost + encodeURIComponent('<esi:assign name="test" value="fail" />') + '" dca="esi"/>';
				str += '<' + tag + ' src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
				var esi = ESI( str );
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
			});

		}

		if (tagName === 'eval') {

			it("should override variables set in parent scope", function(done){

				var str = '';
				str += '<esi:assign name="test" value="ok" />';
				str += '<' + tag + ' src="'+ localhost + encodeURIComponent('<esi:assign name="test" value="overidden" />') + '" dca="none"/>';
				str += '<esi:include src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
				var esi = ESI( str );

				expect(esi).to.eventually.be.eql( 'overidden' ).and.notify(done);

			});

		}

		describe('onerror=continue', function(){


			it("should throw an expection when the ESI fragment returns an error, and no onerror handler is specified", function(done){

				var str = '<' + tag + ' src="'+ localhost + 404 + '"></' + tag + '>';
				var esi = ESI( str );
				esi.then(null, function( response ){
					done();
				});
			});

			it("should catch errors and pass through an empty string if attribute onerror=continue is defined", function(done){

				var str = '<' + tag + ' src="'+ localhost + 404 + '" onerror="continue"></' + tag + '>ok';
				var esi = ESI( str );
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
			});

		});

		describe('dca=esi|none', function(){
			it("should process the response fragment body as ESI if the attribute dca='esi'", function(done){

				var body = "<esi:remove></esi:remove>ok";

				var str = '<' + tag + ' dca="esi" src="'+ localhost + encodeURIComponent(body) + '"></' + tag + '>';
				var esi = ESI( str );
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
			});

			it("should not process the response fragment body as ESI if the attribute dca!='esi'", function(done){

				var body = "<esi:remove></esi:remove>";

				var str = '<' + tag + ' src="'+ localhost + encodeURIComponent(body) + '"></' + tag + '>';
				var esi = ESI( str );
				expect(esi).to.eventually.be.eql( body ).and.notify(done);
			});
		});
	});

});

//
// If an endpoint returns a 404 then esi:try will set the fallback
//
describe('esi:try', function(){

	it("should return the esi:accept block, and not the esi:except block, if response code < 400", function(done){

		var str = '<esi:try><esi:attempt><esi:include src="'+ localhost + 'ok"></esi:include></esi:attempt><esi:except>fail</esi:except></esi:try>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);

	});

	it("should run the esi:except block if esi:attempt block recieves a response code >= 400", function(done){

		var str = '<esi:try><esi:attempt><esi:include src="'+ localhost + 404 + '"></esi:include></esi:attempt><esi:except>ok</esi:except></esi:try>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);

	});

});








describe("esi:remove", function(){

	it("should remove the esi:remove block from the text", function(done){
		var str = '<esi:remove> not </esi:remove>ok';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

});




describe("<!--esi --> comment tag", function(){

	it("should clip the esi comments tags from around the text inside", function(done){
		var str = 'should<!--esi always -->appear';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'should always appear' ).and.notify(done);
	});


	it("should process the ESI content within the esi comment tag, e.g esi:* and $(key)", function(done){
		var str = 'should<!--esi <esi:assign name=key value=always/>$(key) -->appear';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'should always appear' ).and.notify(done);
	});

});



describe("esi:text", function(){

	it("should not render the content within an esi:text block", function(done){
		var text = "$(document)<esi:comment>This would normally get stripped</esi:comment>";
		var str = '<esi:assign name="document" value="ok"/>'+text+'<esi:text>'+text+'</esi:text>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' + text ).and.notify(done);
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
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
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
				expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
			});
		});
	});


	it("should reset the MATCHES between esi:choose's", function(done){

		var test = "$(HTTP_HOST) matches '''^local(.*)'''";
		var str = '<esi:choose><esi:when test="'+ test +'"><esi:assign name="TITLE" value="\'fail\'"/></esi:when></esi:choose>';
		str += '<esi:choose><esi:when test="'+ test +'"><esi:assign name="TITLE" value="\'ok\'"/></esi:when></esi:choose>';
		str += '<esi:vars>$(TITLE)</esi:vars>';

		var esi = ESI( str, null, {
			HTTP_HOST : 'localok'
		});

		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});





	describe("esi:when", function(){

		it("should assign the matches to $(MATCHES{1})", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'">$(MATCHES{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});



		it("should assign the matches to the value of the `matchname` attribute", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'" matchname=pathvars>$(pathvars{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});
	});
});

});




describe("ESI via webserver", function(){

	var testCDN;

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
