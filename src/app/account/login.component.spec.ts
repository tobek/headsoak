import {
  it,
  inject,
  describe,
  beforeEachProviders,
} from '@angular/core/testing';

import {Component, provide} from '@angular/core';
import {MockBackend} from '@angular/http/testing';

// Load the implementations that should be tested
import {LoginComponent, AccountService} from './';
import {AppState} from '../app.service';
import {DataService} from '../data.service';

describe('LoginComponent', () => {
  var loginState;

  class AccountServiceMock {
    loginState$ = {
      subscribe: function(fn) {
        loginState = fn;
      }
    };

    init() {}
    login(email: string, password: string) {
      if (email === 'foo@example.com' && password === 'yes') {
        loginState('logged-in');
      }
      else {
        loginState('error');
      }
    }
    createAccount() { loginState('logged-in'); }
    logout() { loginState('logged-out'); }
  }

  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    MockBackend,
    AppState,
    provide(AccountService, { useClass: AccountServiceMock }),
    DataService,
    LoginComponent
  ]);

  it('should reject unmatching passwords during account creation', inject([LoginComponent], (loginComponent) => {
    loginComponent.email = 'foo@example.com';
    loginComponent.pass1 = 'cool';
    loginComponent.pass2 = 'password';

    spyOn(window, 'alert');
    loginComponent.createAccount();
    expect(window.alert).toHaveBeenCalledWith('Those passwords don\'t match!');
  }));

  it('should change view on successful log in', inject([LoginComponent], (loginComponent) => {
    loginComponent.email = 'foo@example.com';
    loginComponent.password = 'yes';

    loginComponent.ngOnInit();
    loginComponent.login();

    expect(loginComponent.view).toBe('logout');
  }));

  it('should not change view, should clear password on failed log in', inject([LoginComponent], (loginComponent) => {
    loginComponent.email = 'foo@example.com';
    loginComponent.password = 'nope';

    loginComponent.ngOnInit();
    loginComponent.login();

    expect(loginComponent.password).toBe('');
    expect(loginComponent.view).toBe('login');
  }));

  it('should change view on account creation', inject([LoginComponent], (loginComponent) => {
    loginComponent.ngOnInit();
    loginComponent.createAccount();
    expect(loginComponent.view).toBe('logout');
  }));

  it('should change view on log out', inject([LoginComponent], (loginComponent) => {
    loginComponent.ngOnInit();
    loginComponent.logout();
    expect(loginComponent.view).toBe('login');
  }));

});
