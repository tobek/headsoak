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

import {FirebaseMock} from '../mocks/';

var EMAIL = 'email@example.com';
var PASSWORD = 'abc';
var creds = { email: EMAIL, password: PASSWORD };

describe('AccountService', () => {
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

  it('should update lastLogin upon login', () => {
    spyOn(accountService.ref, 'update');

    accountService.login(EMAIL, PASSWORD);

    expect(accountService.ref.update).toHaveBeenCalled();
    expect(accountService.ref.update.calls.mostRecent().args[0].lastLogin).toBeTruthy();
  });

  it('should alert user if lastLogin is updated elsewhere', () => {
    spyOn(accountService, 'userDataUpdated').and.callThrough();
    spyOn(window, 'alert');

    accountService.login(EMAIL, PASSWORD);

    accountService.ref.mockOnCb({
      key: () => 'lastLogin',
      val: () => Date.now()
    });

    expect(accountService.userDataUpdated).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });

});
