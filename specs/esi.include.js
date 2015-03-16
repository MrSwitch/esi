require('./helper');



describe("esi:include", function(){



	it("should be replaced with the resource defined in the `src` attribute", function(done){
		var str = '<esi:include src="'+ localhost +'ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should work indendently and handle multiple queries simultaneiously", function(done){
		var str = '<esi:include ignore src="'+ localhost +'text1" ignorethis>\n ignore this\n </esi:include>, <esi:include ignoreme src="'+ localhost +'text2"></esi:include>,<esi:include src="'+ localhost +'text3"></esi:include>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'text1, text2,text3' ).and.notify(done);
	});

	it("should process ESI VARS in the `src` attribute", function(done){
		var str = '<esi:assign name="server" value="'+ localhost +'"/><esi:include src="$(server)ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

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


	it("should inherit parent scope of the caller", function(done){
		var str = '';
		str += '<esi:assign name="test" value="ok" />';
		str += '<esi:include src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
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


	describe('onerror=continue', function(){


		it("should throw an expection when the ESI fragment returns an error, and no onerror handler is specified", function(done){

			var str = '<esi:include src="'+ localhost + 404 + '"></esi:include>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.rejected.and.notify(done);
		});

		it("should catch errors and pass through an empty string if attribute onerror=continue is defined", function(done){

			var str = '<esi:include src="'+ localhost + 404 + '" onerror="continue"></esi:include>ok';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});

	});

	describe('dca=esi|none', function(){
		it("should process the response fragment body as ESI if the attribute dca='esi'", function(done){

			var body = "<esi:remove></esi:remove>ok";

			var str = '<esi:include dca="esi" src="'+ localhost + encodeURIComponent(body) + '"></esi:include>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});

		it("should not process the response fragment body as ESI if the attribute dca!='esi'", function(done){

			var body = "<esi:remove></esi:remove>";

			var str = '<esi:include src="'+ localhost + encodeURIComponent(body) + '"></esi:include>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( body ).and.notify(done);
		});
	});
});