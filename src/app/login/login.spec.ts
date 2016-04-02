import {
  it,
  inject,
  injectAsync,
  describe,
  beforeEachProviders,
  TestComponentBuilder
} from 'angular2/testing';

import {Component, provide} from 'angular2/core';
import {BaseRequestOptions, Http} from 'angular2/http';
import {MockBackend} from 'angular2/http/testing';

// Load the implementations that should be tested
import {LoginComponent} from './login.component';
import {AppState} from '../app.service';
import {AccountService} from '../account.service';

describe('LoginComponent', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    BaseRequestOptions,
    MockBackend,
    provide(Http, {
      useFactory: function(backend, defaultOptions) {
        return new Http(backend, defaultOptions);
      },
      deps: [MockBackend, BaseRequestOptions]
    }),

    AppState,
    AccountService,
    LoginComponent
  ]);

  // it('should have default data', inject([LoginComponent], (loginComponent) => {
  //   expect(loginComponent.localState).toEqual({ value: '' });
  // }));

  // it('should have a title', inject([LoginComponent], (loginComponent) => {
  //   expect(!!loginComponent.title).toEqual(true);
  // }));

  // it('should log ngOnInit', inject([LoginComponent], (loginComponent) => {
  //   spyOn(console, 'log');
  //   expect(console.log).not.toHaveBeenCalled();

  //   loginComponent.ngOnInit();
  //   expect(console.log).toHaveBeenCalled();
  // }));

});
