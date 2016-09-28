/**
 * Outputs list of recently logged in users to stdout. All other output is to stderr.
 */

var Firebase = require('firebase');
var FirebaseTokenGenerator = require('firebase-token-generator');
var _ = require('lodash');
var Table = require('cli-table');

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

  var users = data.val().users;

  var sortedUsers = _.sortBy(users, function(user) {
    return user.user && user.user.lastLogin ? -1 * user.user.lastLogin : Infinity;
  });

  var table = new Table({
    head: ['Login date', 'Email', 'Display name', '# notes'],
    colWidths: [25, 40, 25, 10],
  });

  _.take(sortedUsers, 20).forEach(function(user) {
    var date = new Date(user.user.lastLogin);
    var dateString = date.toISOString().replace(/\.\d\d\dZ/, '')
    dateString = dateString.replace('T', ' ');

    var numNuts = _.size(
      _.filter(user.nuts, function(nut) {
        return nut && ! nut.sharedBy
      })
    );

    table.push([
      dateString,
      user.user.email,
      user.user.displayName || '',
      numNuts,
    ]);
  });

  console.log(table.toString());

  process.exit();
}, function(err) {
  console.error('failed to get data:', err);
  process.exit(1);
});
