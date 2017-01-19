/**
 * watches FB ref and emails me if a new user signs up
 *
 * example server invocation:
 *
 *     nohup node /home/ubuntu/nutmeg/watcher.js >> /var/log/nutmeg/watcher.log &
 *
 * @TODO There seems to be a slow memory leak here. Horrible hacky fix: schedule a cron to kill this process weekly, using watcher.sh to respawn.
 */

const fs = require('fs'); 
const Firebase = require('firebase');
const FirebaseTokenGenerator = require('firebase-token-generator');

const logger = require('./logger');
const emailer = require('./emailer');

const config = require('../config.json');

const firebaseTokenGenerator = new FirebaseTokenGenerator(config.FIREBASE_SECRET);
const firebaseToken = firebaseTokenGenerator.createToken({uid: 'toby-admin'}, {admin: true});

process.on('uncaughtException', function(err) {
  // Override the default behavior of printing stack trace and exiting

  ohShit('Uncaught exception', err);
});

const ref = new Firebase('https://nutmeg.firebaseio.com/');
ref.authWithCustomToken(firebaseToken, function(err, authData) {
  if (err) {
    ohShit('Firebase authentication failed', err);
  } else {
    logger.log('Authenticated successfully with payload:', authData);
  }
});

// @Hack `child_added` is normally called for all existing children, we can work around this with `limiToLast` - via <https://gist.github.com/katowulf/6383103> via <http://stackoverflow.com/questions/11788902/firebase-child-added-only-get-child-added>
let firstFeedback = true;
let firstUser = true;

ref.child('feedback').limitToLast(1).on('child_added', function(child) {
  if (firstFeedback) {
    firstFeedback = false;
    return;
  }

  logger.log('Received feedback:', JSON.stringify(child.val()));

  emailer.send({
    to: 'tobyfox@gmail.com',
    toName: 'Toby Fox',
    subject: 'New feedback!',
    body: '<p>A user has just left some feedback for Headsoak:</p><pre>' + JSON.stringify(child.val(), null, 2) + '</pre>'
  });

}, function(err) {
  ohShit('Feedback listener cancelled', err);
});

// ref.child('users').limitToLast(1).on('child_added', function(child) {
//   if (firstUser) {
//     firstUser = false;
//     return;
//   }

//   newUserAdded(child.val());

// }, function(err) {
//  ohShit('New user listener cancelled', err);
// });

// function newUserAdded(user) {
//   emailer.send({
//     subject: 'New user signed up!',
//     body: 'New user:\n\n' + JSON.stringify(user.user, null, 2)
//   });

//   // TODO send them welcome email
// }


function ohShit(fuck, err) {
  const antiSpamQuote = `
    <hr>
    <p>Here is a possible explanation for the Fermi Paradox:</p>
    <blockquote>
        <h4>They tend to isolate themselves</h4>
        <p>It has been suggested that some advanced beings may divest themselves of physical form, create massive artificial virtual environments, transfer themselves into these environments through mind uploading, and exist totally within virtual worlds, ignoring the external physical universe.</p>
        <p>It may also be that intelligent alien life develop an "increasing disinterest" in their outside world. Possibly any sufficiently advanced society will develop highly engaging media and entertainment well before the capacity for advanced space travel, and that the rate of appeal of these social contrivances is destined, because of their inherent reduced complexity, to overtake any desire for complex, expensive endeavors such as space exploration and communication. Once any sufficiently advanced civilization becomes able to master its environment, and most of its physical needs are met through technology, various "social and entertainment technologies", including virtual reality, are postulated to become the primary drivers and motivations of that civilization.</p>
        <p>&mdash; <a href="https://en.wikipedia.org/wiki/Fermi_paradox#They_tend_to_isolate_themselves">https://en.wikipedia.org/wiki/Fermi_paradox#They_tend_to_isolate_themselves</a>
    </blockquote>
    <p>Have an excellent day.</p>
  `;

  logger.error('Oh shit:', fuck, err);

  emailer.send({
    to: 'tobyfox@gmail.com',
    toName: 'Toby Fox',
    subject: 'Headsoak Firebase watcher down: ' + fuck,
    body: '<p>Hey Toby,</p><p>There\'s a problem, and the problem is that the Headsoak Firebase watcher has crashed. Here\'s the error:</p><pre>' + (err.stack ? err.stack : JSON.stringify(err, null, 2)) + '</pre>' + antiSpamQuote
  }, function() {
    logger.error('Exiting...');
    process.exit(1);
  });
}
