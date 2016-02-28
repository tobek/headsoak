/**
 * watches FB ref and emails me if a new user signs up
 *
 * example server invocation:
 *
 *     nohup node /home/ubuntu/nutmeg/watcher.js >> /var/log/nutmeg/watcher.log &
 */

var _ = require('lodash');
var Firebase = require('firebase');
var FirebaseTokenGenerator = require('firebase-token-generator');
var nodemailer = require('nodemailer');

var config = require('./config.json');


var mailTransporter = nodemailer.createTransport();
var defaultMailOptions = {
    from: 'Nutmeg <notifications@nutmeg.io>', // TODO more interesting from address
    to: 'how@toby.is',
    subject: 'Nutmeg notification',
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
  sendMail({
    subject: 'Nutmeg new user watcher down: listener cancelled',
    text: err
  });
  process.exit(1);
});



function newUserAdded(user) {
  sendMail({
    subject: 'New user signed up!',
    text: 'New user:\n\n' + JSON.stringify(user.user)
  });

  // TODO send them welcome email
}
