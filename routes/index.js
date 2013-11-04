
/*
 * GET home page.
 */

// var common = require('../lib/common.js');

exports.index = function(req, res){
  var view = {
    title: 'nutmeg',
    scripts: ["/js/lunr.min.js", "/js/jquery.min.js", "/js/underscore.min.js", "/js/js.js"],
  };

  res.render('index', view);
};