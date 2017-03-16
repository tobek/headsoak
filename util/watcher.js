/**
 * Watches FB ref and emails me if a new user signs up or feedback generated.
 *
 * See `config/server/upstart/nutmeg-watcher.conf` for Upstart job for this.
 *
 * @TODO There seems to be a slow memory leak here. Horrible hacky fix: schedule a cron to kill this process weekly, using Upstart to respawn.
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
    logger.log('Authenticated successfully');
  }
});

// @Hack `child_added` is normally called for all existing children, we can work around this with `limiToLast` - via <https://gist.github.com/katowulf/6383103> via <http://stackoverflow.com/questions/11788902/firebase-child-added-only-get-child-added>
let firstFeedback = true;
ref.child('feedback').limitToLast(1).on('child_added', function(child) {
  if (firstFeedback) {
    firstFeedback = false;
    return;
  }

  const feedback = child.val();

  logger.log('Received feedback:', JSON.stringify(feedback));

  let body = '<p>A user has just left some feedback for Headsoak, and here is what they said:</p>';

  body += '<blockquote><p>' + feedback.feedback.replace(/\n/g, '<br>') + '</p></blockquote>';

  body += '<p>';
  body += '<b>Email:</b> <a href="mailto:' + feedback.email + '">' + feedback.email + '</a><br>';
  body += '<b>User ID:</b> ' + feedback.uid + '<br>';
  body += '<b>Display name:</b> ' + feedback.name + '<br>';
  body += '<b>Timestamp:</b> ' + feedback.timestamp + '<br>';
  body += '</p>';

  emailer.send({
    to: 'tobyfox@gmail.com',
    toName: 'Toby Fox',
    cc: [{ email: 'ecedogrucu@gmail.com', name: 'Ece Dogrucu' }],
    subject: 'New feedback!',
    body: body,
    subManagement: false,
  });

}, function(err) {
  ohShit('Feedback listener cancelled', err);
});


// Since we don't use Firebase push for adding user data like we do for feedback, we can rely on ordering used by `limitToLast`. We still want to avoid downloading the entire data store whenever we run this, so we can use `userSince` to order them
ref.child('users').orderByChild('userSince').startAt(Date.now()).on('child_added', function(child) {
  const user = child.val().user;

  logger.log('New user signed up:', user)

  // Notify us
  emailer.send({
    to: 'tobyfox@gmail.com',
    toName: 'Toby Fox',
    subject: 'New user signed up!',
    cc: [{ email: 'ecedogrucu@gmail.com', name: 'Ece Dogrucu' }],
    body: '<p>This is wonderful news</p><p>Here\'s their info:</p><pre>' + JSON.stringify(user, null, 2) + '</pre>',
    subManagement: false,
  });

  // Notify *them*
  emailer.send({
    to: user.email,
    templateId: '00d5673d-9573-4d71-bbda-4118869c2570',
    body: '.', // unused for this template, but sendgrid requires we include something
  });

}, function(err) {
 ohShit('New user listener cancelled', err);
});



// @TODO/refactor We use this here and in emailQueueHandler.js - if we need to use it again just break it out into a module, along with process.on uncaughtException
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
    body: '<p>Hey Toby,</p><p>There\'s a problem, and the problem is that the Headsoak Firebase watcher has crashed. Here\'s the error:</p><pre>' + (err.stack ? err.stack : JSON.stringify(err, null, 2)) + '</pre>' + antiSpamQuote,
    subManagement: false,
  }, function() {
    logger.error('Exiting...\n');
    process.exit(1);
  });
}
