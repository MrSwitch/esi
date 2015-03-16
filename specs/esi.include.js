require('./helper');

var shared = require('./shared.include');


describe("esi:include", function(){

	// Shared behaviours from esi:include
	shared.shouldBehaveLikeAnInclude('esi:include');


	it("should use the `alt` attributes if the `src` returns an error status", function(done){
		var str = '<esi:include src="'+ localhost + 404 + '" alt="' + localhost + 'ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});


	it("should process ESI VARS in the `alt` attribute", function(done){
		var str = '<esi:assign name="server" value="'+ localhost +'"/><esi:include src="$(server)404" alt="$(server)ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should sandbox variables set in the response fragment", function(done){
		var str = '';
		str += '<esi:assign name="test" value="ok" />';
		str += '<esi:include src="'+ localhost + encodeURIComponent('<esi:assign name="test" value="fail" />') + '" dca="esi"/>';
		str += '<esi:include src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

});
