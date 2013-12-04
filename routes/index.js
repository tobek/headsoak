/*
 * GET home page.
 */

// var common = require('../lib/common.js');

exports.index = function(req, res){
  var view = {
    scripts: [
      //* offline
      "/js/jquery.min.js",
      "/js/jquery-ui.min.js",
      "/js/underscore.min.js",
      "/js/angular.min.js",
      "/js/firebase.js",
      "/js/angularfire.min.js",
      //*/
      /* cdn
      "/js/jquery.min.js",
      "/js/jquery-ui.min.js",
      "/js/underscore.min.js",
      "//ajax.googleapis.com/ajax/libs/angularjs/1.2.2/angular.min.js",
      "//cdn.firebase.com/v0/firebase.js",
      "//cdn.firebase.com/libs/angularfire/0.3.0/angularfire.min.js",
      //*/
      "/js/lunr.min.js",
      "/js/js.js"
    ]
  };

  res.render('index', view);
};