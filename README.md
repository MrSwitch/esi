# ESI (Edge Side Include)

This script is to help developing using ESI tags in a document.


# Mock up your own CDN

Say you wanted to pull in a resource from "http://snipets.com/abc.html". 

The ESI tag might look like e.g...

```html
blah blah, oh and here's something i embed in the page using an ESI server ...
<esi:include src="http://snipets.com/abc.html"></esi:include>
```

But then in development you get..., well nothing. But using this tool you can mock it up.


## Via Node app.

```bash
npm install esi --save
```

Simply pass it into any service which uses http.createServer, e.g. below i'm using connect.


```javascript
var esi = require('esi');

var app = connect()
	.use( esi );

var srv = http.createServer(app).listen( 8080 );

// ...

```

# Via client side javascript

```html
        ...
	    <script src="./esi/esi.js"></script>
	</body>
</html>
```