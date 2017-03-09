import {Injectable} from '@angular/core';
import {ReplaySubject, Subject} from 'rxjs';

import {Logger, utils} from '../utils/';
import {DataService, SortOption} from '../data.service';
import {Tag, ChildTag} from '../tags/';
import {TagsService} from '../tags/tags.service';

import {Note} from './';

import * as _ from 'lodash';
const lunr = require('lunr');
// import * as lunr from 'lunr';

@Injectable()
export class NotesService {
  notes: { [noteId: string]: Note } = {}; // id -> Note instance
  initialized$ = new ReplaySubject<void>(1);
  noteUpdated$ = new Subject<Note>();
  index: lunr.Index;

  /**
   * id format convention: `[desiredOrder] + '-' + field + '-' + rev` (not enforced, and changing IDs will break users' saved sort setting)
   */
  sortOpts: SortOption[] = [
    { id: '0-modified-true', field: 'modified', rev: true, text: 'Recently modified' },
    { id: '1-modified-false', field: 'modified', rev: false, text: 'Oldest modified' },
    { id: '2-created-true', field: 'created', rev: true, text: 'Recently created' },
    { id: '3-created-false', field: 'created', rev: false, text: 'Oldest created' },
    { id: '4-body.length-true', field: 'body.length', rev: true, text: 'Longest' },
    { id: '5-body.length-false', field: 'body.length', rev: false, text: 'Shortest' },
    // @TODO/privacy @TODO/tags Hard to test now since the only internal tags (pinning, archiving) dominate sort order. When private notes are done through internal tags, this `nonInternalTagsCount` getter should be tested
    { id: '6-tags.length-true', field: 'nonInternalTagsCount', rev: true, text: 'Most Tags' },
    { id: '7-tags.length-false', field: 'nonInternalTagsCount', rev: false, text: 'Fewest tags' }
    // @TODO: query match strength
    // @NOTE: changes to the fields might require changes to the `sortNotes` function.
  ];

  dataService: DataService;
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public tagsService: TagsService
  ) {
    this.initializeIndex();
  }

  init(notesData: Object, dataService: DataService) {
    this.dataService = dataService;

    if (_.isEmpty(notesData)) {
      notesData = {};
    }

    this._logger.time('Initializing notes and index');
    _(notesData)
      .filter((note) => note)
      .each(this.createNote.bind(this));
    this._logger.timeEnd('Initializing notes and index');

    this.initialized$.next(null);

    this._logger.log('Got', _.size(this.notes), 'notes');
  }

  createNote(noteObj: any = {}, addToDataStore = false): Note {
    if (noteObj.id) {
      if (this.notes[noteObj.id]) {
        throw new Error('Cannot create a new note with id "' + noteObj.id + '" - already taken!');
      }
    }
    else {
      noteObj.id = utils.getUnusedKeyFromObj(this.notes);
      this._logger.log('Creating new note and giving it ID', noteObj.id);
    }

    // @TODO/rewrite/sharing Temporarily hide shared notes until they're set up again
    if (noteObj.sharedBy) {
      return null;
    }

    const newNote = new Note(noteObj, this.dataService);
    this.notes[newNote.id] = newNote;

    if (addToDataStore !== true) {
      // This note exists in data store already, we're just initializing local data on app load. We can assume that stuff that happens on update (upload, run prog tags, etc.) has been done and persisted to data store, and that tag data is synced with tags on notes etc. We just have to add it to the index since build index anew on each app load.
      this.updateNoteInIndex(newNote);
    }
    else {
      newNote.updated(); // will upload to data store, save in index, etc.

      newNote.tags.forEach((tagId: string) => {
        this.tagsService.tags[tagId].addNoteId(newNote.id);
      });
    }

    // @TODO/rewrite Surely much more to do here

    return newNote;
  }

  removeNote(note: Note) {
    this.removeNoteFromIndex(note);
    this.dataService.removeData('note', note.id);
    delete this.notes[note.id];
  }

  initializeIndex(): void {
    this.index = lunr(function() {
      // this.field('title', {boost: 10});
      this.field('tags', {boost: 100});
      this.field('body', {boost: 1});
      this.ref('id');
    });
  }

  // @TODO/testing note indexing and querying should be tested
  updateNoteInIndex(note: Note) {
    // Lunr update just does `remove` then `add` - seems to be fine that this gets called even when it's a new note and isn't in the index already to be removed
    this.index.update({
      id: note.id,
      body: note.body,
      tags: note.tags ? _.map(note.tags, (tagId) => {
        if (this.tagsService.tags[tagId]) { // if this tag id actually exists
          return this.tagsService.tags[tagId].name;
        }
        else {
          // Dunno how a tag id pointing to an undefined (most likely deleted) tag got in here but let's do some clean-up
          // @TODO/rewrite
          // $s.n.removeTagIdFromNut(i, nut.id);
          return '';
        }
      }).join(' ') : ''
    });
  }

  removeNoteFromIndex(note: Note) {
    this.index.remove({
      id: note.id
    });
  }

  /**
   * Returns an array of Notes filtered by various means - everything is `and`ed
   */
  doQuery(query = '', tags?: Tag[], excludeNew = true): Note[] {
    this._logger.time('doing query');

    this._logger.log('queried "' + query + '" with tags', tags);

    if (_.isEmpty(this.notes)) {
      return this.noQueryResults();
    }

    // Arrays of note id's:
    let filteredByTags: string[],
        filteredByString: string[],
        filteredByPrivate: string[];

    // FIRST get the docs filtered by tags
    if (tags && tags.length) {
      filteredByTags = _.intersection(... tags.map((tag) => {
        // @TODO/ece Should this be controllable by a setting? How to phrase? (If this is put under a setting, `isActive` calculation in TagComponent needs to be as well)
        let relevantTags = _.filter(this.tagsService.tags, (otherTag: Tag) => {
          return (<ChildTag> otherTag).childTagName === tag.name;
        });

        if (relevantTags.length) {
          // Include with this tag's docs the docs of any child tag with the same name (e.g. from topic prog tag)
          return _(relevantTags.concat(tag))
            .map('childInclusiveDocs')
            .flatten()
            .union()
            .value() as string[];
        }
        else {
          return tag.childInclusiveDocs;
        }
      }));

      if (filteredByTags.length === 0) {
        // no notes match this combination of tags, so we're done:
        return this.noQueryResults();
      }
    }

    // NEXT get the docs filtered by any string
    if (query && query.length > 2) { // only start live searching once 3 chars have been entered
      const results = this.index.search(query); // by default ANDs spaces: "foo bar" will search foo AND bar
      // results is array of objects each containing `ref` (note id) and `score`
      // ignoring score for now
      filteredByString = results.map((doc) => doc.ref); // gives us an array

      if (filteredByString.length === 0) {
        // no notes have this string, so we're done:
        return this.noQueryResults();
      }
    }

    // ALSO check private notes
    if (! this.dataService.accountService.privateMode) {
      // Private mode off, so hide private notes. Get array of note IDs that aren't private:
      // @TODO/optimization Would probably be faster to filter the inverse and subtract from other lists? because probably few private notes
      filteredByPrivate = _.filter(this.notes, (note) => ! note.private)
        .map((note) => note.id);

      if (filteredByPrivate.length === 0) {
        // *every* note is private (and private mode is off), so we're done:
        return this.noQueryResults();
      }
      else if (filteredByPrivate.length === _.size(this.notes)) {
        // *none* of the notes are private, so we can ignore this
        filteredByPrivate = null;
      }
    }

    let filteredNotes;
    const filterArrays = [];
    if (filteredByTags) {
      filterArrays.push(filteredByTags);
    }
    if (filteredByString) {
      filterArrays.push(filteredByString);
    }
    if (filteredByPrivate) {
      filterArrays.push(filteredByPrivate);
    }

    if (filterArrays.length) {
      const filteredNoteIds = _.intersection(...filterArrays);

      // now build an array pointing to just the nuts that we want to display
      filteredNotes = _.map(filteredNoteIds, (noteId: string) => this.notes[noteId]);
    }
    else {
      // show all
      filteredNotes = _.values(this.notes);
    }

    // @TODO/rewrite - or is this handled by whoever called the query?
    // $s.n.moreNutsCheck(); // new query may mean we have to increase/decrease limit

    if (excludeNew){
      filteredNotes = _.filter(filteredNotes, (note: Note) => note && ! note.new);
    }

    this._logger.timeEnd('doing query');

    return filteredNotes;
  }

  /** Call if no results during `doQuery` */
  noQueryResults(): Note[] {
    this._logger.timeEnd('doing query');
    return [];
    // @TODO/rewrite - this function may not be necessary
    // $s.n.nutsDisplay = [];
    // $s.n.nutsLimit = INITIAL_NUTS_LIMIT;
  }

  /**
   * Returns array of notes (either all notes or a passed-in subset) sorted according to given criteria.
   *
   * Note that we don't want sort order updating *while* you're editing some property that we're sorting on, e.g. you're sorting on recently modified and as you start typing, that note shoots to the top. So we need to control this separately and only change order when we want to.
   */
  sortNotes(sortOpt?, notesToSort?: Note[] | {[k: string]: Note}): Note[] {
    if (! notesToSort) {
      notesToSort = this.notes;
    }
    if (_.isEmpty(notesToSort)) {
      return [];
    }

    if (! sortOpt) {
      // Just get the "first" sort option
      sortOpt = this.sortOpts[0];
    }

    this._logger.time('Sorting notes');
    this._logger.log('Sorting notes by', sortOpt);

    let sortedNotes: Note[];

    if (sortOpt.field.indexOf('.') !== -1 ) { // e.g. field might be `tags.length`
      const fields = sortOpt.field.split('.');

      sortedNotes = _.sortBy(notesToSort, function(note: Note) {
        if (fields[0] === 'body' && ! note.body && note.sharedBody) {
          // shared notes have no `body` but do have `sharedBody`
          return note.sharedBody ? note.sharedBody[fields[1]] : 0;
        }
        else {
          return note[fields[0]] ? note[fields[0]][fields[1]] : 0;
        }
      });
    }
    else { // e.g. `created`
      sortedNotes = _.sortBy(notesToSort, sortOpt.field);
    }
    // @NOTE: Here is a more generic way to deal with this indexing of sub-objects by dot-notation string: http://stackoverflow.com/a/6394168. _.get might do it too.

    if (sortOpt.rev) {
      sortedNotes.reverse();
    }

    // Pinned notes first and archived notes last. Lodash sort is stable, so it'll preserve original order within each group.
    sortedNotes = _.sortBy(sortedNotes, (note) => {
      if (note.pinned) {
        return -1;
      }
      else if (note.archived) {
        return 1;
      }
      else {
        return 0;
      }
    });

    this._logger.timeEnd('Sorting notes');

    return sortedNotes;
  }

  /**
   * Returns an array of Notes run through both query filtering and sorting.
   */
  getNotes(query = '', queryTags?: Tag[], sortOpt?, notesToSort?: Note[]): Note[] {
    return this.sortNotes(sortOpt, this.doQuery(query, queryTags));
  }

  clear(): void {
    this.notes = {};
    this.initializeIndex();
  }
}
