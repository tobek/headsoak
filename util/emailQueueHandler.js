/**
 * Script that grabs emails from `queuedEmails` whose `when` value (unix timestamp in seconds) is in the past, and then processes and sends emails and deletes records, then exits. Logs output to stdout.
 */

const Firebase = require('firebase');
const FirebaseTokenGenerator = require('firebase-token-generator');
const _ = require('lodash');
const async = require('async');

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
    init();
  }
});

// Cache users, tags, and notes for the duration of this run. Each user will have a `tags` and `notes` field that maps ID to data
const users = {};

function init() {
  // This gets object with all queued emails whose `when` values are in the past
  ref.child('queuedEmails').orderByChild('when').endAt(Date.now() / 1000).once('value', function(snapshot) {
    const emails = snapshot.val();

    if (_.isEmpty(emails)) {
      logger.log('No emails to process\n');
      process.exit();
    }

    async.eachOf(emails, prepareEmail, function(err) {
      if (err) {
        ohShit('Ran into error while processing queued emails', err);
      }
      else {
        logger.log('Queued emails handled successfully\n');
        process.exit();
      }
    });
  });
}

function prepareEmail(config, emailId, cb) {
  logger.log('Handling queued email', emailId, JSON.stringify(config));

  const uid = config.uid;

  if (! users[uid]) {
    users[uid] = {};
  }

  async.parallel([
    function(cb) {
      ensureUserInfoFetched(uid, cb);
    },
    function(cb) {
      ensureTagFetched(uid, config.tagId, cb);
    },
    function(cb) {
      if (config.noteId) {
        ensureNoteFetched(uid, config.noteId, cb);
      }
      else {
        return cb();
      }
    },
  ], function(err) {
    if (err) {
      logger.error('Failed to ensure necessary data fetched for email id ' + emailId);
      return cb(err);
    }

    handleEmail(uid, emailId, config, cb);
  });
}

// Assumes all required data is present
function handleEmail(uid, emailId, config, cb) {
  // @TODO/now try/catch
  const compiledTemplate = _.template(config.template);

  const body = compiledTemplate({
    user: users[uid].user,
    tag: users[uid].tags[config.tagId],
    note: config.noteId ? users[uid].notes[config.noteId] : {},
  });

  emailer.send({
    to: users[uid].user.email,
    toName: users[uid].user.displayName || null,
    templateId: '80545ca6-e2a6-4d87-808d-ffeca653bb67',
    subject: config.subject,
    body: body,
    templateData: {
      '%#tag.name#%': users[uid].tags[config.tagId].name,
      '%#tag.id#%': users[uid].tags[config.tagId].id,
    },
  }, function(err) {
    if (err) {
      logger.error('Failed to send email with id ' + emailId);
      return cb(err);
    }

    ref.child('queuedEmails/' + emailId).remove(function(err) {
      if (err) {
        logger.error('Sent email but failed to remove record with id ' + emailId);
        return cb(err);
      }

      logger.log('Successfully sent email and deleted record for id', emailId);
      cb();
    });
  });
}

function ensureUserInfoFetched(uid, cb) {
  if (users[uid].user) {
    return cb();
  }

  ref.child('/users/' + uid + '/user').once('value', (snapshot) => {
    users[uid].user = snapshot.val();
    cb();
  }, cb);
}

function ensureTagFetched(uid, tagId, cb) {
  if (! users[uid].tags) {
    users[uid].tags = {};
  }

  if (users[uid].tags[tagId]) {
    return cb();
  }

  ref.child('/users/' + uid + '/tags/' + tagId).once('value', (snapshot) => {
    const tag = snapshot.val();

    if (tag.dataStr) {
      tag.data = JSON.parse(tag.dataStr);
      delete tag.dataStr;
    }

    delete tag.progFuncString; // unneeded and gums up the logs

    users[uid].tags[tagId] = tag;

    cb();
  }, cb);
}

function ensureNoteFetched(uid, noteId, cb) {
  if (! users[uid].notes) {
    users[uid].notes = {};
  }

  if (users[uid].notes[noteId]) {
    return cb();
  }

  ref.child('/users/' + uid + '/nuts/' + noteId).once('value', (snapshot) => {
    const note = snapshot.val();

    if (note.body) {
      // @TODO/polish @TODO/prog Lodash-template-y looking things could break here. Amongst several things we might want to disable variable interpolation: <https://github.com/lodash/lodash/issues/772>
      note.body = _.escape(note.body).replace(/\n/g, '<br>');
    }

    users[uid].notes[noteId] = note;
    cb();
  }, cb);
}

// @TODO/refactor We use this here and in watcher.js - if we need to use it again just break it out into a module, along with process.on uncaughtException
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
    subject: 'Headsoak email queue handler error: ' + fuck,
    body: '<p>Hey Toby,</p><p>There\'s a problem, and the problem is that the Headsoak email queue handler ran into an error. Here\'s the error:</p><pre>' + (err.stack ? err.stack : JSON.stringify(err, null, 2)) + '</pre>' + antiSpamQuote,
    subManagement: false,
  }, function() {
    logger.error('Exiting...\n');
    process.exit(1);
  });
}
