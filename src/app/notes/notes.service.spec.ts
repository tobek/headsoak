import {
  it,
  inject,
  injectAsync,
  beforeEach,
  beforeEachProviders,
} from 'angular2/testing';

import {NotesService} from './';

var SAMPLE_NOTES = [
  { body: 'This is a short note', id: '1' },
  { body: 'This is a slightly longer note', id: '2' },
];

describe('NotesService', () => {
  beforeEachProviders(() => [
    NotesService,
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
