export class Logger {
  private _prefix: string;

  constructor(private name: string) {
    this._prefix = '[' + name + ']';
  }

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

  private _log(level, ...args) {
    console[level](this._prefix, ...args);
  }
}
