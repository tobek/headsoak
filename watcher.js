/**
 * watches FB ref and emails me if a new user signs up
 */

var _ = require('lodash');
var Firebase = require('firebase');
var FirebaseTokenGenerator = require('firebase-token-generator');
var nodemailer = require('nodemailer');

var config = require('./config.json');


var mailTransporter = nodemailer.createTransport();
var defaultMailOptions = {
    from: 'Nutmeg <notifications@nutmeg.io>', // TODO more interesting from address
    to: 'tobyfox@gmail.com',
    subject: 'New user signed up!',
    text: '[default message]'
};


function sendMail(mailOptions) {
  mailOptions = _.defaults(mailOptions, defaultMailOptions);

  mailTransporter.sendMail(mailOptions, function(err, info) {
    if (err) {
      console.error('failed to send mail:', err);
    }
    else {
      console.log('sent mail:', info);
    }
  });
}


var tokenGenerator = new FirebaseTokenGenerator(config.FIREBASE_SECRET);
var token = tokenGenerator.createToken({uid: 'toby-admin'}, {admin: true});

var ref = new Firebase('https://nutmeg.firebaseio.com/users');
ref.authWithCustomToken(token, function(error, authData) {
  if (error) {
    console.error('Login Failed!', error);
    process.exit(1);
  } else {
    console.error('Authenticated successfully with payload:', authData);
  }
});


// hack to ignore that child_added is called for all existing children:
var initialData = true;
setTimeout(function() {
  console.log('now actually listening for new users');
  initialData = false;
}, 10000);

ref.on('child_added', function(child) {
  if (initialData) return;

  newUserAdded(child.val());
}, function(err) {
  console.error('listener canceled:', err);
  process.exit(1);
});



function newUserAdded(user) {
  sendMail({text: 'new user!\n\n' + JSON.stringify(user)}); // todo just send user info

  // TODO send them welcome email
}