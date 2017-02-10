import * as _ from 'lodash';

// @TODO/rewrite Hide all but warnings and errors unless in dev mode? 
// @TODO/analytics Fire analytics events on warnings and errors. Maybe also pass in the class instance to the constructor so that we can log info about the instance?
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

  private _log(level, ...args) {
    console[level](this._prefix, ...args);

    // @TODO/polish @TODO/error reporting The `hsErrorReport` function inlined in index.html should go via something other than GA so we can capture from adblocking users?
    // @NOTE We hit `hsErrorReport` from a bunch of different places, so make sure to search entire codebase when making major changes.
    if (level === 'warn' || level === 'error') {
      let message = '';
      let err = null;

      message += _.map(
        _.filter(args, (arg) => {
          if (arg instanceof Error) {
            err = arg;
            return false;
          }
          return true;
        }),
        (nonErrArg) => {
          return JSON.stringify(nonErrArg).replace(/^"/, '').replace(/"$/, '');
        }
      ).join(', ');

      window['hsErrorReport'](level, message, this.name, null, null, err);
    }
  }
}
