export class FirebaseMock {
  authCb: Function;
  mockOnCb: Function;

  EMAIL: string = 'email@example.com';
  PASSWORD: string = 'abc';

  onAuth(cb): void {
    this.authCb = cb;
    this.authCb(null); // mock always has initial auth state as logged out
  }

  authWithPassword(creds, cb = function(err?) {}) {
    if (creds.email === this.EMAIL && creds.password === this.PASSWORD) {
      this.authCb({
        uid: 'OFFLINE',
        provider: 'password',
        password: { email: this.EMAIL }
      });
      cb();
    }
    else {
      cb({
        code: 'INVALID_USER',
        message: 'Wrong credentials, but this is a mock Firebase instance - try email/pass email@example.com/abc.'
      });
    }
  }

  unauth() {
    this.authCb(null);
  }

  resetPassword(accountInfo, cb) {
    cb();
  }
  changePassword(accountInfo, cb) {
    cb();
  }

  createUser(creationCreds, cb) {
    cb(null, creationCreds);
  }

  removeUser(creds, cb) {
    if (creds.password === this.PASSWORD) {
      cb(null);
    }
    else {
      cb({ code: 'INVALID_PASSWORD' });
    }
  }

  root() {
    return this;
  }
  child(key: string) {
    return this;
  }

  update(data: any, cb?: Function) {
    cb();
  }
  set(value: any, cb?: Function) {
  }
  push(value: any, cb?: Function) {

  }

  on(event: string, cb: Function, err?: Function) {
    this.mockOnCb = cb;
  }
  once(event: string, cb: Function, err?: Function) {
    this.mockOnCb = cb;
  }
  off(event?) {}
}
