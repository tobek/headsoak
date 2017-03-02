/**
 * Outputs complete JSON content of Firebase to stdout. All other output is to stderr
 *
 * Example shell invocation with nice file name:
 *
 *     filename=backups/firebase_dump_`date +"%Y-%m-%d"`.json && node util/backup.js > $filename && gzip $filename
 *
 * Example cron invocation for hourly backups (note, %'s need to be escaped in cron jobs):
 *
 *     0 * * * * filename=/home/ubuntu/nutmeg/backups/firebase_dump_`date +"\%Y-\%m-\%d-\%H"`.json && /usr/local/bin/node /home/ubuntu/nutmeg/util/backup.js > $filename && gzip $filename
 *
 * Example cron for deleting month+ old hourly backups (The two commands are a silly way to delete all except the midnight ("00") backup so we still have one per day)
 *
 *     0 0 * * * find /home/ubuntu/nutmeg/backups/ -name "firebase_dump_$(date --date="$(date +\%Y-\%m-\%d) -31 day" +'\%Y-\%m-\%d')-[1-9]*" -delete
 *     0 0 * * * find /home/ubuntu/nutmeg/backups/ -name "firebase_dump_$(date --date="$(date +\%Y-\%m-\%d) -31 day" +'\%Y-\%m-\%d')-0[1-9]*" -delete
 */

var Firebase = require('firebase');
var FirebaseTokenGenerator = require('firebase-token-generator');

var config = require('../config.json');


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
