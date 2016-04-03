import {
  it,
  inject,
  injectAsync,
  describe,
  beforeEachProviders,
  TestComponentBuilder
} from 'angular2/testing';

import {Component, provide} from 'angular2/core';
import {MockBackend} from 'angular2/http/testing';

// Load the implementations that should be tested
import {LoginComponent} from './login.component';
import {AppState} from '../app.service';
import {AccountService} from '../account.service';
import {DataService} from '../data.service';
import {PubSubService} from '../pub-sub.service';

describe('LoginComponent', () => {
  var pubSubCb;

  class PubSubServiceMock {
    subscribe(fn) {
      pubSubCb = fn;
    }
  }

  class AccountServiceMock {
    init() {}
    login(email: string, password: string) {
      if (email === 'foo@example.com' && password === 'yes') {
        pubSubCb('logged-in');
      }
      else {
        pubSubCb('error');
      }
    }
    createAccount() { pubSubCb('logged-in'); }
    logout() { pubSubCb('logged-out'); }
  }

  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    MockBackend,
    AppState,
    provide(AccountService, { useClass: AccountServiceMock }),
    DataService,
    provide(PubSubService, { useClass: PubSubServiceMock }),
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
