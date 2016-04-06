import {
  it,
  inject,
  injectAsync,
  beforeEachProviders,
  TestComponentBuilder
} from 'angular2/testing';

// Load the implementations that should be tested
import {App} from './app.component';
import {AppState} from './app.service';
import {UserService, AccountService} from './account';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';

describe('App', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    App,
    AppState,
    AnalyticsService,
    DataService,
    AccountService,
    UserService,
  ]);

  it('should have a name', inject([ App ], (app) => {
    expect(app.name).toEqual('nutmeg');
  }));

});
