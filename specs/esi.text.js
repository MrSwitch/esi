require('./helper');


describe("esi:text", function(){

	it("should not render the content within an esi:text block", function(done){
		var text = "$(document)<esi:comment>This would normally get stripped</esi:comment>";
		var str = '<esi:assign name="document" value="ok"/>'+text+'<esi:text>'+text+'</esi:text>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' + text ).and.notify(done);
	});

});