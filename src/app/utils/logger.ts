import * as _ from 'lodash';
import * as safeStringify from 'json-stringify-safe';

// @TODO/rewrite Hide all but warnings and errors unless in dev mode?
// @TODO/errors On staging we should maybe pop up errors in toasters or modals?
export class Logger {
  private _prefix: string;

  constructor(private name: string) {
    this._prefix = '[' + name + ']';
  }

  /** Essentially debug level, but we don't need FIVE different levels so using the not-annoyingly-blue-in-chrome `log` as our lowest level. */
  log(...args) {
    this._log('log', ...args);
  }
  info(...args) {
    this._log('info', ...args);
  }
  warn(...args) {
    this._log('warn', ...args);
  }
  error(...args) {
    this._log('error', ...args);
  }

  time(name) {
    console.time(this._prefix + ' ' + name);
  }
  timeEnd(name) {
    console.timeEnd(this._prefix + ' ' + name);
  }

  logTime(...args) {
    const time = Math.floor(performance.now() - (window['hsLoginTime'] || 0)) / 1000;

    this._log('debug', ...args.concat([
      '- at',
      time,
      'seconds' + (window['hsLoginTime'] ? ' since login' : '')
    ]));

    // @HACK
    if (window['hsEvent']) {
      window['hsEvent']('Timing', this.name, args.join(' - '), time);
    }
  }

  /** Set time since page load at which the user logged in. This is *only* set if the user logs in manually. If the user is cookied and logged in on page load, this remains 0. */
  setLoginTime() {
    // @HACK TERRIBLE HACK Since everyone has their own Logger instance, we need to set this somewhere global or else have a global Logger service that everthing attaches itself to. Anyway it's set up the way it is right now and this is a quick and shitty way to make it work. @TODO/refactor
    window['hsLoginTime'] = performance.now();
  }

  private _log(level, ...args) {
    console[level](this._prefix, ...args);

    // @TODO/polish @TODO/error reporting The `hsErrorReport` function inlined in index.html should go via something other than GA so we can capture from adblocking users?
    // @NOTE We hit `hsErrorReport` from a bunch of different places, so make sure to search entire codebase when making major changes.
    if (level === 'warn' || level === 'error') {
      let message = '';
      let err = null;

      message += _.map(
        _.filter(args, (arg) => {
          if (! arg) {
            return false;
          }
          else if (! err && arg instanceof Error) {
            err = arg;
            return false;
          }
          return true;
        }),
        (nonErrArg) => {
          if (nonErrArg.forDataStore) {
            // notes, tags, and settings have a simpler representation so we can send up less data
            nonErrArg = nonErrArg.forDataStore();
          }
          return (safeStringify(nonErrArg) || '').replace(/^"|"$/g, '');
        }
      ).join(', ');

      window['hsErrorReport'](level, message, this.name, null, null, err);
    }
  }
}
