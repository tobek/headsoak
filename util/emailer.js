const config = require('../config.json');

const _ = require('lodash');
const sendgrid = require('sendgrid')(config.SENDGRID_API_KEY);

const logger = require('./logger');

const debug = false;


const defaultOptions = {
  from: 'support@headsoak.com', // @TODO/email More interesting from address (especially for welcome emails)
  fromName: 'Headsoak',
  to: 'tobyfox@gmail.com',
  toName: null,
  cc: null,
  subject: 'Headsoak notification',
  isHtml: true,
  templateId: null,
  templateData: null, // object mapping from keys (e.g. `'-name-'`) to values to replace them with in the template
  // @NOTE If using a template, the given subject and body replace `<%subject%>` and `<%body%>` in the template, if they exist
  subManagement: undefined, // whether to include unsubscribe link
};

function sendMail(opts, cb) {
  opts = _.defaults(opts, defaultOptions);

  // Overview of properties here: https://sendgrid.com/docs/API_Reference/Web_API_v3/Mail/index.html
  const mailData = {
    from: {
      email: opts.from,
      name: opts.fromName
    },
    subject: opts.subject,
    content: [
      {
        type: opts.isHtml ? 'text/html' : 'text/plain',
        value: opts.body
      }
    ],
    personalizations: [
      {
        to: [
          {
            email: opts.to,
            name: opts.toName
          },
        ],
      }
    ],
  };

  if (opts.cc) {
    mailData.personalizations[0].cc = opts.cc;
  }

  if (opts.templateId) {
    mailData.template_id = opts.templateId;

    if (opts.templateData) {
      mailData.personalizations[0].substitutions = opts.templateData;
    }
  }

  if (typeof opts.subManagement !== 'undefined') {
    mailData.tracking_settings = {
      subscription_tracking: {
        enable: opts.subManagement
      }
    }
  }

  logger.log('[emailer] Attempting to send email:', JSON.stringify(mailData));

   
  const request = sendgrid.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mailData,
  });

  if (debug) {
    if (cb) {
      cb();
    }
    return;
  }
   
  sendgrid.API(request, function(error, response) {
    if (error) {
      logger.error('[emailer] Error response received:', error);
      if (response && response.body && response.body.errors) {
        logger.error('[emailer] Errors:', response.body.errors);
      }
    }
    else {
      logger.log('[emailer] Email sent successfully');
    }

    logger.log('[emailer] Response:', response);

    if (cb) {
      cb(error, response);
    }
  });
}

module.exports = {
  send: sendMail,
};