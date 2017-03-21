'use strict';

/**
 * Calling the `ohShit` function will log an error, email the admin with that error, and shut down the process. Including this module also attaches the ohShit function to uncaught exceptions in the process that would end the process anyway.
 *
 * Call this module with a module name to identify logging and emails that it logs/sends.
 */

const path = require('path');
const _ = require('lodash');
const safeStringify = require('json-stringify-safe');

const logger = require('./logger');
const emailer = require('./emailer');

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

function ohShit(name, fuck, err) {
  logger.error('Oh shit:', fuck, err);

  emailer.send({
    to: 'tobyfox@gmail.com',
    toName: 'Toby Fox',
    subject: 'Headsoak ' + name + ' down: ' + fuck,
    body: '<p>Hey Toby,</p><p>There\'s a problem, and the problem is that the Headsoak ' + name + ' has crashed. Here\'s the error:</p><pre>' + (err.stack ? err.stack : safeStringify(err, null, 2)) + '</pre><p>Process args:</p><pre>' + JSON.stringify(process.argv) + '</pre>' + antiSpamQuote,
    subManagement: false,
  }, function() {
    logger.error('Exiting...\n');
    process.exit(1);
  });
}

process.on('uncaughtException', function(err) {
  // Override the default behavior of printing stack trace and exiting

  ohShit(path.basename(process.argv[1]), 'Uncaught exception', err);
});


module.exports = function(name) {
  return _.partial(ohShit, name);
};
