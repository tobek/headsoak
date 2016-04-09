import {
  it,
  inject,
  injectAsync,
  beforeEach,
  beforeEachProviders,
} from 'angular2/testing';

import {DataService} from './data.service';
import {UserService} from './account/user.service';
import {NotesService} from './notes/';
import {TagsService} from './tags/';

describe('DataService', () => {
  class FirebaseMock {
  }

  beforeEachProviders(() => [
    DataService,
    UserService,
    NotesService,
    TagsService,
  ]);

  var dataService;
  beforeEach(inject([ DataService ], (injectedService) => {
    window['Firebase'] = FirebaseMock;

    dataService = injectedService;
    dataService.ref = new FirebaseMock();
    // dataService.init();
  }));

  it('should exist', () => {
    expect(dataService).toBeTruthy();
  });

});
