//
// ESI
// This script looks for ESI fragments on a page and replaces them with their counterpart
//
// @author Andrew Dodson
// @since 07/2014

(function(){


// Find all ESI fragments on the page
// e.g. <esi:include src="http://resources.com/markup"></esi:include>

function esi(document){

	// Enable hidden esi comment code 
	enableESICommentContent(document);


	// esi:remove tags
	disableESITagRemove(document);


	// Replace 
	var tags = document.getElementsByTagName('esi:include');

	// Foreach Tag
	while( tags.length ){

		esiTag(tags[0]);

	}
}

//
// Expose
//
window.esi = esi;


//
// initiate ESI on the document object
//

esi(document);

//
// Process an esi tag
//
function esiTag(tag){

	// Create a ghost of the fragment in the DOM
	var ghost = ghostifyNode( tag );

	// Read instructions
	var src = tag.getAttribute('src');

	// Load the src request
	load( src, function(body){
		
		// If there was no response
		if(!body){
			after( document.createComment('ESI error occured'), ghost );
			return;
		}

		// Create a document fragment
		var frag = createFrag( body );

		// Insert into position
		after( ghost, frag );

		// Rerun esi
		esi(document);
	});
}



//
// Create Frag
//
function createFrag( html ){

	// Create a new Fragment
	var frag = document.createDocumentFragment();

	// Create a div
	var div = document.createElement('div');
	div.innerHTML = html;

	// Loop through its children
	while( div.childNodes.length ){

		// Append child to the fragment
		frag.appendChild( div.childNodes[0] );

	}

	// Return the fragment
	return frag;
}


//
// After
// Insert a DOM node after an element
//
function after( target, node ){

	var parent = target.parentNode;
	var next = target.nextSibling;

	if(next){
		parent.insertBefore(node, next);
	}
	else{
		parent.appendChild(node);
	}
}


//
// Load the request and respond with the request
//
function load(url, callback){
	// Make an HTTP request for the resource at src;
	var x = new XMLHttpRequest();
	x.open('GET', url, false);
	x.onerror = cb;
	x.onload = cb;
	x.send();

	function cb(){
		if(callback){
			callback(x.responseText);
			callback=null;
		}
	}
}


function ghostifyNode(node){
	
	var ghost = document.createComment( node.outerHTML );
	after( node, ghost );

	// Remove the current element from the DOM
	node.parentNode.removeChild(node);

	return ghost;
}

//
// Enable ESI Comment code

function enableESICommentContent(node){
    if(!node)
        return;
    if(node.nodeType==8){
        var m = node.data.match(/^esi\s([\S\s]*)/);
        if( m ){
        	node.data = "processed-esi-comment " + m[1];
        	var frag = createFrag( m[1] );
        	after( node, frag );

        }
    }
    if(!node.childNodes)
        return;
    for(var i=0;i<node.childNodes.length;i++)
        enableESICommentContent(node.childNodes[i]);
}

function disableESITagRemove(document){

	var tags = document.getElementsByTagName('esi:remove');

	while( tags.length ){
		ghostifyNode( tags[0] );
	}
}

// EOF esi
})();