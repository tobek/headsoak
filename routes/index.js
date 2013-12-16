/*
 * GET home page.
 */

// var common = require('../lib/common.js');

exports.index = function(req, res){

  // clunky way to check whether we're online or not
  require('dns').resolve('www.google.com', function(err) {

    if (err) { // not connected
      console.log("Not connected to Internet, will use local JS files");
      var scripts = [
        "/js/jquery.min.js",
        "/js/jquery-ui.min.js",
        "/js/underscore.min.js",
        "/js/angular.min.js",
        //"/js/angular-animate.min.js",
        "/js/firebase.js",
        //"/js/angularfire.min.js",
        "/js/firebase-simple-login.js"
      ];
    }
    else { // connected
      console.log("Resolved google.com so think we're connected, will use CDNs for JS");
      var scripts = [
        "//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js",
        "//ajax.googleapis.com/ajax/libs/jqueryui/1.10.3/jquery-ui.min.js",
        "/js/underscore.min.js",
        "//ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular.min.js",
        //"//ajax.googleapis.com/ajax/libs/angularjs/1.2.5/angular-animate.min.js",
        "//cdn.firebase.com/v0/firebase.js",
        //"//cdn.firebase.com/libs/angularfire/0.3.0/angularfire.min.js",
        "https://cdn.firebase.com/v0/firebase-simple-login.js"
      ];
    }

    var view = {
      'scripts': scripts.concat([
        // scripts served by this server:
        "/js/lunr.min.js",
        "/js/js.js"
      ])
    };
    res.render('index', view);
  });

};