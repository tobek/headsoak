// Integration test of AccountService and UserService

import {
  it,
  inject,
  injectAsync,
  beforeEach,
  beforeEachProviders,
} from 'angular2/testing';

// Load the implementations that should be tested
import {DataService} from '../data.service';
import {AnalyticsService} from '../analytics.service';
import {AccountService} from './account.service';
import {UserService} from './user.service';
import {NotesService} from '../notes/';
import {TagsService} from '../tags/';

var EMAIL = 'email@example.com';
var PASSWORD = 'abc';
var creds = { email: EMAIL, password: PASSWORD, id: 'simplelogin:1' };

describe('AccountService', () => {
  class FirebaseMock {
    authCb: Function;

    onAuth(cb) {
      this.authCb = cb;
      this.authCb(null); // mock always has initial auth state as logged out
    }

    authWithPassword(creds, cb) {
      if (creds.email === EMAIL && creds.password === PASSWORD) {
        this.authCb({
          uid: 'simplelogin:1',
          provider: 'password',
          password: { email: EMAIL }
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
      if (creds.password === PASSWORD) {
        cb(null);
      }
      else {
        cb({ code: 'INVALID_PASSWORD' });
      }
    }
  }

  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    AnalyticsService,
    DataService,
    AccountService,
    UserService,
    NotesService,
    TagsService,
  ]);

  var accountService;
  beforeEach(inject([ AccountService ], (injectedService) => {
    window['Firebase'] = FirebaseMock;

    accountService = injectedService;
    accountService.ref = new FirebaseMock();
    accountService.init();
  }));

  it('should initialized with logged-out user', () => {
    expect(accountService.user.loggedIn).toBe(false);
  });

  it('should log in successfully and initialize data', () => {
    spyOn(accountService.dataService, 'init');

    accountService.login(EMAIL, PASSWORD);

    expect(accountService.user.loggedIn).toBe(true);
    expect(accountService.user.email).toBe(EMAIL);
    expect(accountService.dataService.init).toHaveBeenCalled();
  });

  it('should alert upon invalid login', () => {
    spyOn(window, 'alert');

    accountService.login(EMAIL, 'nope');

    expect(accountService.user.loggedIn).toBe(false);
    expect(window.alert).toHaveBeenCalledWith('Incorrect account credentials.');
  });

  it('should clear info upon logout', () => {
    accountService.login(EMAIL, PASSWORD);
    accountService.logout();

    expect(accountService.user.loggedIn).toBe(false);
    expect(accountService.user.email).toBeNull();
  });

  it('should alert on successful password reset', () => {
    spyOn(window, 'alert');

    accountService.passwordReset(creds, () => {});

    expect(window.alert).toHaveBeenCalled();
  });

  it('should create account without error and then log in', () => {
    spyOn(accountService.dataService, 'init');

    accountService.createAccount(EMAIL, PASSWORD);

    expect(accountService.user.loggedIn).toBe(true);
    expect(accountService.user.email).toBe(EMAIL);
    expect(accountService.dataService.init).toHaveBeenCalled();
  });

  it('should delete account and logout if provided with correct password', () => {
    spyOn(accountService, 'logout');

    accountService.deleteAccount(EMAIL, PASSWORD);

    expect(accountService.logout).toHaveBeenCalled();
  });

  it('should alert if wrong password provided to delete account', () => {
    spyOn(window, 'alert');

    accountService.deleteAccount(EMAIL, 'nope');

    expect(window.alert).toHaveBeenCalledWith('Wrong password! Reconsidering deleting your account?');
  });

});
