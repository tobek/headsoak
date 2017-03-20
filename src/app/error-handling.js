// @TODO/polish @TODO/build This is currently simply manually minified and inserted into `index.html` - should be part of build instead. (But inlining it in `index.html` is intended so that it can still work even if the built JS bundles are really fucked up.)

(function(){
  var hsErrorIndex = {};
  
  window.hsErrorReport = function(severity, msg, url, line, col, err) {
    var info, label;

    try {
      info = [msg, url, line, col].filter(function(val) { return !! val }).join(' - ');

      if (err) {
        label = err.toString ? err.toString() : err;
        if (err.stack) {
          label += ' - ' + err.stack;
        }
      }

      hsErrorIndex[info + label] = (hsErrorIndex[info + label] || 0) + 1;
      if (hsErrorIndex[info + label] === 10) {
        severity += 'Overload';
      }
      else if (hsErrorIndex[info + label] > 10) {
        return;
      }

      if (window.hsDebugError) {
        window.hsDebugError(severity, info, label);
      }
    }
    catch (e) {
      severity = (severity || '') + 'Failed';
      info = info ? (info + ' - ') : '';
      info += 'error reporting failed: ' + e.toString();
    }

    // console.log('Handling error:', severity, info, label);
    // @TODO/analytics This should go there as well (prob analytics should have a handler on window, which fires ga and other stuff, and we hit that here)
    ga('send', {
      hitType: 'event',
      eventCategory: 'JS' + severity,
      eventAction: info,
      eventLabel: label
    });
  };

  window.hsErrorReportVal = function(severity, val) {
    if (val instanceof Error) {
      hsErrorReport(severity, val.toString(), null, null, null, val.stack);
    }
    else {
      hsErrorReport(severity, val);
    }
  }

  window.onerror = function(msg, url, line, col, err) {
    if (msg && msg.indexOf('Script error.') !== -1) {
      return;
    }

    hsErrorReport('unhandled', msg, url, line, col, err);
  };
})();