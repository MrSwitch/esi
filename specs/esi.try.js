require('./helper');


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