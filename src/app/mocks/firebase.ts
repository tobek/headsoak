// @TODO/rewrite/fbSdk3 This doesn't work with new Firebase SDK 3. App has been migrated but mocks have not been. See https://www.firebase.com/docs/web/api/firebase/onauth.html.
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

  resetPassword(creds, cb) {
    cb();
  }
  changePassword(creds, cb) {
    if (creds.oldPassword === this.PASSWORD) {
      cb();
    }
    else {
      cb({
        code: 'INVALID_PASSWORD',
        message: 'Wrong credentials, but this is a mock Firebase instance - try password "abc".'
      });
    }
  }

  changeEmail(creds, cb) {
    if (creds.password === this.PASSWORD) {
      cb();
    }
    else {
      cb({
        code: 'INVALID_PASSWORD',
        message: 'Wrong credentials, but this is a mock Firebase instance - try password "abc".'
      });
    }
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
