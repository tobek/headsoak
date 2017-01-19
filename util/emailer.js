const config = require('../config.json');

const _ = require('lodash');
const sendgridLib = require('sendgrid');
const helper = sendgridLib.mail;
const sendgrid = sendgridLib(config.SENDGRID_API_KEY);

const logger = require('./logger');


const defaultOptions = {
  from: 'noreply@headsoak.com', // TODO more interesting from address
  fromName: 'Headsoak',
  to: 'tobyfox@gmail.com',
  toName: null,
  subject: 'Headsoak notification',
  isHtml: true,
  templateId: null,
  templateData: null,
  // @NOTE If using a template, the given subject and body replace `<%subject%>` and `<%body%>` in the template, if it exists
};

function sendMail(opts, cb) {
  opts = _.defaults(opts, defaultOptions);
  logger.log('[emailer] Attempting to send email:', opts);

  const fromEmail = opts.fromName ? new helper.Email(opts.from, opts.fromName) : new helper.Email(opts.from);
  const toEmail = opts.toName ? new helper.Email(opts.to, opts.toName) : new helper.Email(opts.to);
  const body = new helper.Content(opts.isHtml ? 'text/html' : 'text/plain', opts.body);

  const mail = new helper.Mail(
    fromEmail,
    opts.subject,
    toEmail,
    body
  );

  if (opts.templateId) {
    _.each(opts.templateData, function(value, key) { // e.g. `key` might be `'-name-'` and gets swapped out in template for `value`
      mail.personalizations[0].addSubstitution(new helper.Substitution(key, value));
    });

    mail.setTemplateId(opts.templateId);
  }
   
  const request = sendgrid.emptyRequest({
    method: 'POST',
    path: '/v3/mail/send',
    body: mail.toJSON(),
  });
   
  sendgrid.API(request, function(error, response) {
    if (error) {
      logger.error('[emailer] Error response received:', error);
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