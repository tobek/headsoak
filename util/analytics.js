'use strict';

const Hapi = require('hapi');
const Joi = require('joi');

const server = new Hapi.Server();
server.connection({ 
    host: 'localhost', 
    port: 7001
});

server.route([{
  method: 'POST',
  path:'/axon', 
  handler: function (request, reply) {
    console.log('New event', JSON.stringify(request.payload));
    return reply({ statusCode: 200, message: 'ok' });
  },
  config: {
    validate: {
      payload: {
        category: Joi.string().min(1).required(),
        action: Joi.string().min(1).required(),
        time_since: Joi.number().required(),
        session_id: Joi.number().required(),
      }
    }
  }
}, {
  method: 'POST',
  path:'/neurogenesis', 
  handler: function (request, reply) {
    const sessionId = 12345;
    console.log('New session', sessionId, JSON.stringify(request.payload));
    return reply({
      statusCode: 200,
      message: 'ok',
      session_id: sessionId,
    });
  },
}]);

server.start((err) => {
  if (err) {
    throw err;
  }
  console.log('Analytics server running at:', server.info.uri);
});
