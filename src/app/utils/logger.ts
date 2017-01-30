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
  }
}
