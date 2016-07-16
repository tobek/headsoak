import {
  it,
  inject,
  beforeEach,
  beforeEachProviders,
} from '@angular/core/testing';
import {provide} from '@angular/core';

import {DataService} from './data.service';
import {UserService} from './account/user.service';
import {NotesService} from './notes/';
import {TagsService} from './tags/';

import {FirebaseMock} from './mocks/';

var SAMPLE_DATA = {
  nuts: {},
  tags: {},
  user: {},
  featuresSeen: Infinity,
};

class NotesServiceMock {
  init(notes) {}
}
class TagsServiceMock {
  init(tags) {}
}

describe('DataService', () => {
  beforeEachProviders(() => [
    DataService,
    UserService,
    provide(NotesService, { useClass: NotesServiceMock }),
    provide(TagsService, { useClass: TagsServiceMock }),
  ]);

  var dataService;
  beforeEach(inject([ DataService ], (injectedService) => {
    dataService = injectedService;
    dataService.ref = new FirebaseMock;
  }));

  it('should initialize notes, tags, and data on init', () => {
    spyOn(dataService.notes, 'init');
    spyOn(dataService.tags, 'init');
    spyOn(dataService.user, 'setData');

    dataService.init('some-uid');
    dataService.ref.mockOnCb({ val: () => SAMPLE_DATA });

    expect(dataService.notes.init).toHaveBeenCalled();
    expect(dataService.tags.init).toHaveBeenCalled();
    expect(dataService.user.setData).toHaveBeenCalled();
  });

  it('should initialize new user', () => {
    spyOn(dataService, 'initNewUser');

    dataService.init('some-uid');
    dataService.ref.mockOnCb({ val: () => null });

    expect(dataService.initNewUser).toHaveBeenCalled();
  });

  it('should show new features if there are any and then update featuresSeen', () => {
    spyOn(window, 'alert');
    spyOn(dataService, 'handleNewFeatures').and.callThrough();

    dataService.init('some-uid');

    SAMPLE_DATA.featuresSeen = 1;
    dataService.NEW_FEATURE_COUNT = 2;
    dataService.ref.mockOnCb({ val: () => SAMPLE_DATA });

    expect(dataService.handleNewFeatures).toHaveBeenCalled();


    spyOn(dataService.ref, 'set');
    dataService.ref.mockOnCb({ val: () => ['feature one', 'feature two'] });

    expect(dataService.ref.set.calls.mostRecent().args[0]).toBeGreaterThan(1);

    var alertArg = window.alert['calls'].mostRecent().args[0]; // TypeScript doesn't realize window.alert has changed by `spyOn` and so can't find `calls` property, but accessing it this way bypasses that check
    expect(alertArg).not.toContain('feature one');
    expect(alertArg).toContain('feature two');
  });

  it('should not show new features if there aren\'t any', () => {
    spyOn(dataService._logger, 'log');

    dataService.init('some-uid');

    SAMPLE_DATA.featuresSeen = Infinity;
    dataService.ref.mockOnCb({ val: () => SAMPLE_DATA });

    expect(dataService._logger.log).toHaveBeenCalledWith('[latestFeatures] Already seen em');
  });

});
