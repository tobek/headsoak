import {
  it,
  inject,
  beforeEach,
  beforeEachProviders,
} from '@angular/core/testing';
import {provide} from '@angular/core';

import {NotesService} from './';
import {TagsService} from '../tags/';

var SAMPLE_NOTES = [
  { body: 'This is a short note', id: '1' },
  { body: 'This is a slightly longer note', id: '2' },
];

class TagsServiceMock {
  tags = [];
  init(tags) {}
}

describe('NotesService', () => {
  beforeEachProviders(() => [
    NotesService,
    provide(TagsService, { useClass: TagsServiceMock }),
  ]);

  var notesService;
  beforeEach(inject([ NotesService ], (injectedService) => {
    notesService = injectedService;
  }));

  it('should initialize notes', () => {
    notesService.init(SAMPLE_NOTES);

    expect(_.keys(notesService.notes).length).toBe(2);
  });

  // @TODO/tests
  // sorting (different kinds?)
  // creating note (with id, and with auto-assigning id)

});
