require('./helper');


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