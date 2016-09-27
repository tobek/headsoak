export class FirebaseMock {
  authCb: Function;
  mockOnCb: Function;

  EMAIL: string = 'email@example.com';
  PASSWORD: string = 'abc';

  onAuth(cb) {
    this.authCb = cb;
    this.authCb(null); // mock always has initial auth state as logged out
  }

  authWithPassword(creds, cb) {
    if (creds.email === this.EMAIL && creds.password === this.PASSWORD) {
      this.authCb({
        uid: 'some-uid',
        provider: 'password',
        password: { email: this.EMAIL }
      });
      cb();
    }
    else {
      cb({ code: 'INVALID_USER' });
    }
  }

  unauth() {
    this.authCb(null);
  }

  resetPassword(accountInfo, cb) {
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
