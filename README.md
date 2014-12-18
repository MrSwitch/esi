# Node ESI Language parser

[![Build Status](https://travis-ci.org/MrSwitch/esi.svg?branch=master)](https://travis-ci.org/MrSwitch/esi)

[Edge Side Includes](http://www.w3.org/TR/esi-lang) (ESI) Language is a templating language supported by popular CDN's such as Akamai and Varnish. This NPM module will pre-processes ESI tags within your node server environment.



# Example
You want to embed the fragment of HTML from "http://snipets.com/abc.html" within an HTML document.

    blah blah, oh and here i embed in the page a snipet using an ESI server ...
    <esi:include src="http://snipets.com/snipet.html"></esi:include>

**snipet.html**

    <b>Snipet</b>


With Node ESI script, you can pre-process ESI tags. 

## Include the script

    npm install esi --save

Simply pass it into any service which uses http.createServer, e.g. below i'm using connect.

## Add ESI as middleware

    var app = require('connect')();
    
    var esi = require('esi');
    app.use( esi );
    
    var srv = http.createServer(app).listen( 8080 );

Now the page is constructed and the response looks like this...

    blah blah, oh and here i embed in the page a snipet using an ESI server ...
    <b>Snipet</b>






# Specs

View [the ESI specs](https://travis-ci.org/MrSwitch/esi) or from the install directory run.

    mocha specs -R spec






# Options

Debug - prints out the tag handling

    esi.debug = true;


VARS - set/modify environment variables

    esi.vars.HTTP_HOST = 'www.google.com';
