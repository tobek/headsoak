/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');
var jade = require('jade');
var fs = require('fs');
var wrench = require('wrench');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(require('less-middleware')({ src: path.join(__dirname, 'public') }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// this site is entirely static. we just have to use jade to generate public/index.html
// TODO i think that right now the less file is only compiled to CSS when the server gets hit for stylesheets/style.css. maybe disable less-middleware and just compile it right now

// clunky way to check whether we're online or not
require('dns').resolve('www.google.com', function(err) {

  if (err) { // not connected
    console.log("Not connected to Internet, will use local JS files\nNOTE: These offline JS files don't match versions of CDN JS, and offline functionality is largely broken anyway");
    var scripts = [
      "/js/offline/jquery.min.js",
      //"/js/offline/jquery-ui.min.js",
      //"/js/offline/underscore.min.js",
      "/js/offline/angular.min.js",
      //"/js/offline/angular-animate.min.js",
      "/js/offline/firebase.js",
      //"/js/offline/angularfire.min.js",
      "/js/offline/firebase-simple-login.js"
    ];
  }
  else { // connected
    console.log("Resolved google.com so think we're connected, will use CDNs for JS");
    var scripts = [
      "//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js",
      //"//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js",
      //"//cdnjs.cloudflare.com/ajax/libs/underscore.js/1.5.2/underscore-min.js",
      "//ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min.js",
      //"//ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular-animate.min.js",
      "//cdn.firebase.com/js/client/2.0.6/firebase.js",
      //"//cdn.firebase.com/libs/angularfire/0.3.0/angularfire.min.js",
      "//cdn.firebase.com/js/simple-login/1.6.4/firebase-simple-login.js"
    ];
  }

  var view = {
    'scripts': scripts.concat([
      // scripts served by this server:
      "/js/lunr.min.js",
      "/js/mousetrap.min.js",
      "/js/mousetrap-global-bind.min.js",
      "/js/fuzzy-match-sorter.js",
      "/js/jquery.autocomplete.mod.js",
      "/js/js.js"
    ]),
    styles: [
      '/stylesheets/style.css',
      '//netdna.bootstrapcdn.com/font-awesome/4.0.3/css/font-awesome.css'
    ]
  };

  console.log("Compiling html from jade...");
  wrench.readdirRecursive('views', function(err, files) {
    if (err) throw err;
    if (files) {
      files.forEach(function(f) {
        jade.renderFile('views/'+f, view, function (err, html) {
          if (err) throw err;
          fs.writeFile('public/'+f.replace('.jade', '.html'), html, function(err) {
            if (err) throw err;
          })
        });
      });
    }
  });

  http.createServer(app).listen(app.get('port'), function(){
    console.log('Express server listening on port ' + app.get('port'));
  });

}); // end dns attempt to resolve google