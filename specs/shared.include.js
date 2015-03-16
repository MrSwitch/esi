
exports.shouldBehaveLikeAnInclude = function(tag){


	it("should be replaced with the resource defined in the `src` attribute", function(done){
		var str = '<' + tag + ' src="'+ localhost +'ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should work indendently and handle multiple queries simultaneiously", function(done){
		var str = '<' + tag + ' ignore src="'+ localhost +'text1" ignorethis>\n ignore this\n </' + tag + '>, <' + tag + ' ignoreme src="'+ localhost +'text2"></' + tag + '>,<' + tag + ' src="'+ localhost +'text3"></' + tag + '>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'text1, text2,text3' ).and.notify(done);
	});

	it("should process ESI VARS in the `src` attribute", function(done){
		var str = '<esi:assign name="server" value="'+ localhost +'"/><' + tag + ' src="$(server)ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});


	it("should inherit parent scope of the caller", function(done){
		var str = '';
		str += '<esi:assign name="test" value="ok" />';
		str += '<' + tag + ' src="'+ localhost + encodeURIComponent('<esi:vars>$(test)</esi:vars>') + '" dca="esi"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	
	});


	describe('onerror=continue', function(){


		it("should throw an expection when the ESI fragment returns an error, and no onerror handler is specified", function(done){

			var str = '<' + tag + ' src="'+ localhost + 404 + '"></' + tag + '>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.rejectedWith(Error).and.notify(done);
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
}