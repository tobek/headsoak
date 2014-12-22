var config = require('./config.json');

var includeRegex = /\.(html|js|css|gif|png|jpg)$/;
var excludeRegex = /\/offline\//;

// ====================

var fs = require('fs');
var wrench = require('wrench');
var s3config = config.s3; // config needs properties key, secret, and bucket
var client = require('knox').createClient(s3config);

wrench.readdirRecursive('public', function(err, files) {
  if (err) throw err;
  if (files) {
    files.forEach(function(f) {
      if (f.match(includeRegex) && !f.match(excludeRegex)) {
        pushToS3(f);
      }
    });
  }
});

function pushToS3(f) {
  console.log("deploying " + f + "...");
  client.putFile('public/'+f, '/'+f, {'x-amz-acl': 'public-read'}, function(err, res){
    if (err) throw err;
    if (res.statusCode == 200) {
      console.log('successfully PUT ' + res.req.url);
    }
    res.resume();
  });
}