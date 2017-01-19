var moment = require('moment');

var FORMAT = 'YYYY-MM-DD HH:mm:ss';

function _log(func, args) {
  console[func].apply(null,
    ['[' + moment().format(FORMAT) + '][' + func + ']'].concat(args)
  );
}

var Logger = {
  log: function() {
    // convert `arguments` to array and also don't leak them, so V8 can optimize
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    _log('log', args);
  },
  warn: function() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    _log('warn', args);
  },
  error: function() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; ++i) {
        args[i] = arguments[i];
    }

    _log('error', args);
  }
};

module.exports = Logger;