'use strict';

/**
 * API for logging events and sessions into our analytics DB.
 *
 * See `config/server/upstart/nutmeg-analytics.conf` for Upstart job for this.
 *
 * Testing locally:
 *
 *     curl --data "timestamp=1490047902723&timezone=foo" http://localhost:7001/neurogenesis && echo -e '\n'
 *     curl --data "category=asdf&action=foo&time_since=1234&session_id=1&timestamp=19387123" http://localhost:7001/axon && echo -e '\n'
 */

const Hapi = require('hapi');
const joi = require('joi');
const acceptLangParser = require('accept-language-parser');
const mysql = require('mysql');

const logger = require('./logger');
const ohShit = require('./oh-shit')('analytics receiver');

const config = require('../config.json');


config.analytics_db.connectionLimit = 10;
const db = mysql.createPool(config.analytics_db);

// So that we can fail explicitly if it's down, rather than waiting until an actual request comes in and failing then, we maintain a single open connection in the pool and monitor it for errors:
let testConn, oldTestConn;
function testDbConnection() {
  db.getConnection(function(err, connection) {
    if (err) {
      ohShit('Failed to initiate connection to analytics database: ' + err.code, err);
    }

    // logger.log('Connected to DB with id ' + connection.threadId);

    oldTestConn = testConn;
    testConn = connection;

    testConn.on('error', function(err) {
      ohShit('Analytics database connection error: ' + err.code, err);
    });

    oldTestConn && oldTestConn.release();
  });
}
const connectionTestInterval = setInterval(testDbConnection, 10000);
testDbConnection();


const server = new Hapi.Server();
server.connection({ 
    host: 'localhost',
    port: 7001
});

server.route([{
  method: 'POST',
  path:'/axon', 
  config: {
    validate: {
      payload: {
        // @TODO/refactor This interface is basically used by client-side analytics, would be great to import from there!
        category: joi.string().min(1).required(),
        action: joi.string().min(1).required(),
        timestamp: joi.number().required(),
        time_since: joi.number().required(),
        session_id: joi.number().required(),

        uid: joi.string(),
        label: joi.string(),
        value: joi.number(),
        route: joi.string(),
      }
    }
  },
  handler: function (request, reply) {
    const eventData = {
      timestamp: new Date(request.payload.timestamp),
      session_id: request.payload.session_id,
      uid: request.payload.uid,
      route: request.payload.route && request.payload.route.substring(0, 256),

      category: request.payload.category.substring(0, 64),
      action: request.payload.action.substring(0, 65535),
      label: request.payload.label && request.payload.label.substring(0, 65535),
      value: request.payload.value,
      time_since: request.payload.time_since,
    };

    // See <https://github.com/mysqljs/mysql#escaping-query-values> for how passing an object replaces `?` with query id/value pairs (it also escapes them at the same time)
    db.query('INSERT INTO user_app_events SET ?', eventData, function(err) {
      if (err) {
        throw err;
      }

      // logger.log('Logged event', eventData);

      reply({
        statusCode: 200,
        message: 'ok',
      });
    });
  },
},
{
  method: 'POST',
  path:'/neurogenesis', 
  config: {
    validate: {
      payload: {
        // @TODO/refactor This interface is basically used by client-side analytics, would be great to import from there!
        timestamp: joi.number().required(),

        timezone: joi.string(),
        viewport_x: joi.number(),
        viewport_y: joi.number(),
      }
    }
  },
  handler: function (request, reply) {
    const sessionData = {
      timestamp: new Date(request.payload.timestamp),
      user_agent: request.headers['user-agent'] && request.headers['user-agent'].substring(0, 256),
      ip_address: request.headers['x-forwarded-for'] || request.info.remoteAddress || request.info.address,
      timezone: request.payload.timezone,
      viewport_x: request.payload.viewport_x,
      viewport_y: request.payload.viewport_y,
    };

    if (request.headers['accept-language']) {
      const langs = acceptLangParser.parse(request.headers['accept-language']);
      if (langs && langs[0]) {
        sessionData['language'] = langs[0].code;

        if (langs[0].region) {
          sessionData['language'] += '-' + langs[0].region;
        }
      }
    }

    // See <https://github.com/mysqljs/mysql#escaping-query-values> for how passing an object replaces `?` with query id/value pairs (it also escapes them at the same time)
    db.query('INSERT INTO user_app_session SET ?', sessionData, function(err, results) {
      if (err) {
        throw err;
      }

      const sessionId = results.insertId;

      // logger.log('Created session', sessionId, sessionData);

      reply({
        statusCode: 200,
        message: 'ok',
        session_id: sessionId,
      });
    });
  },
}]);


server.start((err) => {
  if (err) {
    throw err;
  }
  logger.log('Analytics server running at:', server.info.uri);
});


function shutdown() {
  testConn && testConn.release();
  clearInterval(connectionTestInterval);

  db.end(() => logger.log('DB connection pool ended successfully'));
  server.stop(() => logger.log('Server shutdown successful'));
}
process
  .once('SIGINT', shutdown)
  .once('SIGTERM', shutdown);
