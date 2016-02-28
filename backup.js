/**
 * outputs complete JSON content of Firebase to stdout
 * all other output is to stderr
 *
 * example cron invocation (note, %'s need to be escaped in cron jobs):
 *
 *     0 0 * * * filename=/home/ubuntu/nutmeg/backups/firebase_dump_`date +"\%Y-\%m-\%d"`.json && node /home/ubuntu/nutmeg/backup.js > $filename && gzip $filename
 */

var Firebase = require('firebase');
var FirebaseTokenGenerator = require('firebase-token-generator');

var config = require('./config.json');


var tokenGenerator = new FirebaseTokenGenerator(config.FIREBASE_SECRET);
var token = tokenGenerator.createToken({uid: 'toby-admin'}, {admin: true});

var ref = new Firebase('https://nutmeg.firebaseio.com/');
ref.authWithCustomToken(token, function(error, authData) {
  if (error) {
    console.error('Login Failed!', error);
    process.exit(1);
  } else {
    console.error('Authenticated successfully with payload:', authData);
  }
});

ref.once('value', function(data) {
  console.error('successfully retrieved data');
  var everything = data.val();

  console.log(JSON.stringify(everything));
  // TODO: upload to S3

  process.exit();
}, function(err) {
  console.error('failed to get data:', err);
  process.exit(1);
});
