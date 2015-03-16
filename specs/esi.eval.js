require('./helper');

var shared = require('./shared.include');


describe("esi:eval", function(){

	// Include behaviours from esi:include
	shared.shouldBehaveLikeAnInclude("esi:eval");


	// Additional conditions on esi:eval
	it("should override variables set in parent scope", function(done){

		var str = '';
		str += '<esi:assign name="test" value="ok" />';
		str += '<esi:eval src="'+ localhost + encodeURIComponent('<esi:assign name="test" value="overidden" />') + '" dca="none"/>';
		str += '<esi:include src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
		var esi = ESI( str );

		expect(esi).to.eventually.be.eql( 'overidden' ).and.notify(done);
	});

	it("should not support the use the of the `alt` attribute", function(done){
		var str = '<esi:eval src="'+ localhost + 404 + '" alt="' + localhost + 'ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.rejectedWith(Error).and.notify(done);
	});


	it("should inherit parent scope of the caller", function(done){
		var str = '';
		str += '<esi:assign name="test" value="ok" />';
		str += '<esi:eval src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});


});