import {
  it,
  inject,
  injectAsync,
  beforeEach,
  beforeEachProviders,
} from '@angular/core/testing';

import {TagsService} from './';

var SAMPLE_TAGS = [
  { name: 'Cool tag bro', id: '1' },
  { name: 'Cooler tag, bro', id: '2' },
];

describe('TagsService', () => {
  beforeEachProviders(() => [
    TagsService,
  ]);

  var tagsService;
  beforeEach(inject([ TagsService ], (injectedService) => {
    tagsService = injectedService;
  }));

  it('should initialize tags', () => {
    tagsService.init(SAMPLE_TAGS);

    expect(_.keys(tagsService.tags).length).toBe(2);
  });

  // @TODO/tests
  // lots more

});
