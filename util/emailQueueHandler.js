/**
 * Script that grabs emails from `queuedEmails` whose `sendAt` value (unix timestamp in seconds) is in the past, and then processes and sends emails and deletes records, then exits. Logs output to stdout.
 *
 * Example hourly invocation in cron:
 *
 *     0 * * * * /usr/local/bin/node /home/ubuntu/nutmeg/util/emailQueueHandler.js >> /var/log/nutmeg/email-queue-handler.log
 *
 * @TODO/prog @TODO/polish We should periodically check that `queuedEmails` isn't getting too huge or weird...
 */

const Firebase = require('firebase');
const FirebaseTokenGenerator = require('firebase-token-generator');
const _ = require('lodash');
const async = require('async');

const logger = require('./logger');
const emailer = require('./emailer');
const ohShit = require('./oh-shit')('email queue handler');

const config = require('../config.json');

const firebaseTokenGenerator = new FirebaseTokenGenerator(config.FIREBASE_SECRET);
const firebaseToken = firebaseTokenGenerator.createToken({uid: 'toby-admin'}, {admin: true});


const ref = new Firebase('https://nutmeg.firebaseio.com/');
ref.authWithCustomToken(firebaseToken, function(err, authData) {
  if (err) {
    ohShit('Firebase authentication failed', err);
  } else {
    logger.log('Authenticated successfully');
    init();
  }
});

// Cache users, tags, and notes for the duration of this run. Each user will have a `tags` and `notes` field that maps ID to data. No need for cache expiry because this process is run on a cron job so cache will be fresh each time.
const users = {};

function init() {
  // This gets object with all queued emails whose `sendAt` values are in the past
  ref.child('queuedEmails').orderByChild('sendAt').endAt(Date.now() / 1000).once('value', function(snapshot) {
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

  if (config.type !== 'prog') {
    throw new Error('Unknown email type "' + config.type + '"');
  }

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

    try {
      handleEmail(uid, emailId, config, cb);
    }
    catch (err) {
      logger.error('Error thrown during handleEmail:', err);
      cb(err);
    }
  });
}

// Assumes all required data is present
function handleEmail(uid, emailId, config, cb) {
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
    let user = snapshot.val();

    user = _.mapValues(user, function(val) {
      return typeof prop === 'string' ? _.escape(val) : val;
    });

    users[uid].user = user;

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
    let tag = snapshot.val();

    if (tag.dataStr) {
      tag.data = JSON.parse(tag.dataStr);
      delete tag.dataStr;
    }

    delete tag.progFuncString; // unneeded and gums up the logs

    tag = _.mapValues(tag, function(val) {
      return typeof prop === 'string' ? _.escape(val) : val;
    });

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
    let note = snapshot.val();

    note = _.mapValues(note, function(val) {
      return typeof prop === 'string' ? _.escape(val) : val;
    });

    if (note.body) {
      // @TODO/polish @TODO/prog Lodash-template-y looking things could break here. Amongst several things we might want to disable variable interpolation: <https://github.com/lodash/lodash/issues/772>
      note.body = note.body.replace(/\n/g, '<br>');
    }

    note.tags = note.tags || [];
    note.tagInstances = [];
    async.each(note.tags, _.partial(ensureTagFetched, uid), function(err) {
      if (err) {
        logger.error('Failed to fetch tags on note ' + noteId);
        return cb(err);
      }

      note.tags.forEach(function(tagId) {
        var tag = users[uid].tags[tagId];
        if (tag) {
          note.tagInstances.push(tag)
        }
      });

      users[uid].notes[noteId] = note;
      cb();
    });
  }, cb);
}
