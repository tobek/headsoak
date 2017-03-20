'use strict';

/**
 * API for logging events and sessions into our analytics DB.
 *
 * See `config/server/upstart/nutmeg-analytics.conf` for Upstart job for this.
 */

const Hapi = require('hapi');
const joi = require('joi');
const acceptLangParser = require('accept-language-parser');
const mysql = require('mysql');

const logger = require('./logger');
const ohShit = require('./oh-shit')('analytics receiver');

const config = require('../config.json');

const db = mysql.createConnection(config.analytics_db);
db.connect(function(err) {
  if (err) {
    ohShit('Failed to connect to analytics database', err);
  }
  // logger.log('Connected to DB as id ' + db.threadId);
});

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
      route: request.payload.route,

      category: request.payload.category,
      action: request.payload.action,
      label: request.payload.label,
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
      user_agent: request.headers['user-agent'],
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
  server.stop(() => logger.log('Server shutdown successful'));

  db.destroy();
  logger.log('DB connection terminated successfully');
}
process
  .once('SIGINT', shutdown)
  .once('SIGTERM', shutdown);
