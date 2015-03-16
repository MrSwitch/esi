require('./helper');


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