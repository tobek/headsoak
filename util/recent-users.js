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
  var totalNotes = 0;

  _.each(users, function(user, uid) {
    user.uid = uid;
  });

  var sortedUsers = _.sortBy(users, function(user) {
    return user.user && user.user.lastLogin ? -1 * user.user.lastLogin : Infinity;
  });

  var table = new Table({
    head: ['Login date', 'Email', 'Display name', '# notes', 'uid'],
    colWidths: [24, 30, 15, 10, 20],
  });

  _.take(sortedUsers, 10000).forEach(function(user) {
  // sortedUsers.forEach(function(user) {
    if (! user.user) {
      user.user = {};
    }

    var dateString;
    if (user.user.lastLogin) {
      var date = new Date(user.user.lastLogin);
      dateString = date.toISOString().replace(/\.\d\d\dZ/, '')
      dateString = dateString.replace('T', ' ');
    }
    else {
      dateString =  'earlier';
    }

    var numNuts = _.size(
      _.filter(user.nuts, function(nut) {
        return nut && ! nut.sharedBy
      })
    );

    if (numNuts !== 3) {
      // New users start with 3 so let's not count them
      totalNotes += numNuts;
    }

    table.push([
      dateString,
      user.user.email || '',
      user.user.displayName || '',
      numNuts,
      user.uid
    ]);
  });

  console.log(table.toString());

  console.log('Total users:', _.size(users));
  console.log('Total notes:', totalNotes, '(excluding 3 starter notes)');

  process.exit();
}, function(err) {
  console.error('failed to get data:', err);
  process.exit(1);
});
