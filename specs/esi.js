require('./helper');


describe("ESI", function(){

	it("should return a promise object", function(){
		var esi = ESI('text');
		expect( esi ).to.have.property( 'then' );
	});

	it("should not affect regular content", function(done){
		var str = 'ok';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should process open and closed tags, i.e. <esi:tag/> and <esi:tag></esi:tag>", function(done){
		var str = '<esi:comment/><esi:comment a/><esi:comment a />ok<esi:comment>removed</esi:other></esi:comment>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	it("should be extensible e.g. ESI.fn[tagName] = handler", function(done){

		ESI.fn['esi:something'] = function( attrs, body, scope ){
			return attrs.value;
		};

		var str = '<esi:something value="ok"/>';
		var esi = ESI( str );
		expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
	});

	context("Synchronous requests", function(){

		beforeEach(function(){
			ESI.fn['esi:pause'] = function( attrs, body, scope ){

				// Create a new promise
				var promise = new Promise(function(resolve, reject){
					// Do something ASYNC
					setTimeout(function(){
						scope.content = attrs.content;
						resolve('')
					}, parseInt(attrs.delay,10) );

				});

				// Change the internal promise handler 
				// Now based upon the successful response of this promise.			
				this.promise = promise;

				return promise;
			};
		});

		afterEach(function(){
			delete ESI.fn['esi:pause'];
		});

		it("should wait for response", function(done){
			var str = '<esi:pause delay=100 content="ok"/><esi:vars>$(content)</esi:vars>';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});

		it("should pause the entire chain", function(done){
			var str = '<esi:vars><esi:pause delay=100 content="fail"/></esi:vars><esi:vars>$(content)</esi:vars>ok';
			var esi = ESI( str );
			expect(esi).to.eventually.be.eql( 'ok' ).and.notify(done);
		});
	});

});