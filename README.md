# ESI (Edge Side Include)

Edge Side Includes processing for Client and Node environments

Say you wanted to pull in a resource from "http://snipets.com/abc.html". 

With ESI your'll include an ESI tag amongst your other markup...

```html
blah blah, oh and here i embed in the page a snipet using an ESI server ...
<esi:include src="http://snipets.com/abc.html"></esi:include>
```

But then without an ESI server how do you see this rendered?

With this tool, you can mock it up in two ways


## via Node webapp.

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

## via Client side javascript

```html
        ...
	    <script src="./esi/esi.js"></script>
	</body>
</html>
```
