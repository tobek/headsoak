export class Logger {
  private _prefix: string;

  constructor(private name: string) {
    this._prefix = '[' + name + ']';
  }

  _log(level, ...args) {
    console[level](this._prefix, ...args);
  }

  log(...args) {
    this._log('log', ...args);
  }
  warn(...args) {
    this._log('warn', ...args);
  }
  error(...args) {
    this._log('error', ...args);
  }
}
