require('./helper');


describe("esi:choose", function(){

	describe("should render esi:when block when its attribute `test` is truthy", function(){

		[
			'$(HTTP_HOST) == localhost',
			'$(HTTP_HOST)',
			"$(HTTP_HOST) matches '''^local.*''' ",
			"$(HTTP_HOST) has local",
			"$(HTTP_HOST) != remote"
		].forEach(function(test){

			it("true: " + test, function(done){

				var str = '<esi:choose><esi:when test="'+ test +'">ok</esi:when><esi:otherwise>fail</esi:otherwise></esi:choose>';
				var esi = ESI( str, null, {
					HTTP_HOST : 'localhost'
				} );
				esi.then(function( response ){
					expect( response ).to.be.eql( 'ok' );
					done();
				});
			});
		});

	});

	describe("should render esi:otherwise block when previous esi:when tests are falsy", function(){

		[
			'$(unknown)',
			'!$(HTTP_HOST)',
			'$(HTTP_HOST) == remote'
		].forEach(function(test){

			it("false: " + test, function(done){

				var str = '<esi:choose><esi:when test="'+ test +'">fail</esi:when><esi:otherwise>ok</esi:otherwise></esi:choose>';
				var esi = ESI( str, null, {
					HTTP_HOST : 'localhost'
				} );
				esi.then(function( response ){
					expect( response ).to.be.eql( 'ok' );
					done();
				});
			});
		});
	});


	it("should reset the MATCHES between esi:choose's", function(done){

		var test = "$(HTTP_HOST) matches '''^local(.*)'''";
		var str = '<esi:choose><esi:when test="'+ test +'"><esi:assign name="TITLE" value="\'fail\'"/></esi:when></esi:choose>';
		str += '<esi:choose><esi:when test="'+ test +'"><esi:assign name="TITLE" value="\'ok\'"/></esi:when></esi:choose>';
		str += '<esi:vars>$(TITLE)</esi:vars>';

		var esi = ESI( str, null, {
			HTTP_HOST : 'localok'
		});

		esi.then(function( response ){
			expect( response ).to.be.eql( 'ok' );
			done();
		});
	});





	describe("esi:when", function(){

		it("should assign the matches to $(MATCHES{1})", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'">$(MATCHES{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			esi.then(function( response ){
				expect( response ).to.be.eql( 'ok' );
				done();
			});
		});



		it("should assign the matches to the value of the `matchname` attribute", function(done){

			var test = "$(HTTP_HOST) matches '''^local(.*)'''";
			var str = '<esi:choose><esi:when test="'+ test +'" matchname=pathvars>$(pathvars{1})</esi:when></esi:choose>';

			var esi = ESI( str, null, {
				HTTP_HOST : 'localok'
			});

			esi.then(function( response ){
				expect( response ).to.be.eql( 'ok' );
				done();
			});
		});
	});

});