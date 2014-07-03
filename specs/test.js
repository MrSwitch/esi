//
// Test the ESI proxy
//

var ESI = require('../src/esi.js');

var expect = require('expect.js');

describe("ESI", function(){

	it("Should return a promise object", function(){

		var esi = ESI('text');

		expect( esi ).to.have.property( 'then' );

	});

});