require('./helper');


describe("esi:remove", function(){

	it("should remove the esi:remove block from the text", function(done){
		var str = '<esi:remove> not </esi:remove>ok';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

});