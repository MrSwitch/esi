require('./helper');


describe("esi:text", function(){

	it("should not render the content within an esi:text block", function(done){
		var text = "$(document)<esi:comment>This would normally get stripped</esi:comment>";
		var str = '<esi:assign name="document" value="ok"/>'+text+'<esi:text>'+text+'</esi:text>';
		var esi = ESI( str );
		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' + text );
			done();
		});
	});

});