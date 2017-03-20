'use strict';

/**
 * API for logging events and sessions into our analytics DB.
 *
 * See `config/server/upstart/nutmeg-analytics.conf` for Upstart job for this.
 */

const Hapi = require('hapi');
const joi = require('joi');
const acceptLangParser = require('accept-language-parser');

const logger = require('./logger');
const ohShit = require('./oh-shit')('analytics receiver');

const server = new Hapi.Server();
server.connection({ 
    host: 'localhost',
    port: 7001
});

server.route([{
  method: 'POST',
  path:'/axon', 
  handler: function (request, reply) {
    // logger.log('New event', JSON.stringify(request.payload));
    return reply({ statusCode: 200, message: 'ok' });
  },
  config: {
    validate: {
      payload: {
        category: joi.string().min(1).required(),
        action: joi.string().min(1).required(),
        timestamp: joi.number().required(),
        time_since: joi.number().required(),
        session_id: joi.number().required(),
      }
    }
  }
}, {
  method: 'POST',
  path:'/neurogenesis', 
  handler: function (request, reply) {
    const sessionData = {
      user_agent: request.headers['user-agent'],
      ip_address: request.info.address,
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

    const sessionId = 12345;

    // logger.log('New session from', sessionId, JSON.stringify(request.payload));

    return reply({
      statusCode: 200,
      message: 'ok',
      session_id: sessionId,
    });
  },
  config: {
    validate: {
      payload: {
        timestamp: joi.number().required(),
      }
    }
  }
}]);


server.start((err) => {
  if (err) {
    throw err;
  }
  logger.log('Analytics server running at:', server.info.uri);
});


function shutdown() {
  server.stop(() => logger.log('Server shutdown successful'));
}
process
  .once('SIGINT', shutdown)
  .once('SIGTERM', shutdown);
