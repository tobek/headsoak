import {
  beforeEachProviders,
  inject,
  it
} from '@angular/core/testing';

// Load the implementations that should be tested
import {App} from './app.component';
import {UserService, AccountService} from './account';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {NotesService} from './notes/';

describe('App', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    App,
    AnalyticsService,
    DataService,
    AccountService,
    UserService,
    NotesService,
  ]);

  it('should have a name', inject([ App ], (app) => {
    expect(app.name).toEqual('nutmeg');
  }));

});
