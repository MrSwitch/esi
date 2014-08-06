# ESI (Edge Side Include) [![Build Status](https://travis-ci.org/MrSwitch/esi.svg?branch=master)](https://travis-ci.org/MrSwitch/esi)

Edge Side Includes processing for Client and Node environments

Say you wanted to pull in a resource from "http://snipets.com/abc.html". 

With CDN's you might include an ESI tag amongst your HTML document, for example...

```html
blah blah, oh and here i embed in the page a snipet using an ESI server ...
<esi:include src="http://snipets.com/abc.html"></esi:include>
```

With this script, you can mock up the effects of ESI rendering in the following two ways...


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
	    <script src="./esi.js"></script>
	</body>
</html>
```


# Specs

View the [This ESI specs online](https://travis-ci.org/MrSwitch/esi) or by running from the installed directory

```
mocha specs -R spec
```
