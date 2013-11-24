
/*
 * GET home page.
 */

// var common = require('../lib/common.js');

exports.index = function(req, res){
  var view = {
    title: 'nutmeg',
    scripts: ["/js/lunr.min.js", "/js/jquery.min.js", "/js/jquery-ui.min.js", "/js/underscore.min.js", "http://ajax.googleapis.com/ajax/libs/angularjs/1.2.2/angular.min.js", "/js/js.js"],
  };

  res.render('index', view);
};