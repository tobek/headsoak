import {Injectable} from '@angular/core';
import {ReplaySubject, Subject} from 'rxjs';

import {Logger, utils} from '../utils/';
import {DataService} from '../';
import {Tag, TagsService} from '../tags/';

import {Note} from './';

const lunr = require('lunr');

@Injectable()
export class NotesService {
  notes: { [key: string]: Note } = {}; // id -> Note instance
  initialized$ = new ReplaySubject<void>(1);
  noteUpdated$ = new Subject<Note>();
  index: lunr.Index;

  /**
   * id format: `[desiredOrder] + '-' + field + '-' + rev`
   */
  sortOpts = [
    { id: '0-modified-true', field: 'modified', rev: true, name: 'Recently modified' },
    { id: '1-modified-false', field: 'modified', rev: false, name: 'Oldest modified' },
    { id: '2-created-true', field: 'created', rev: true, name: 'Recently created' },
    { id: '3-created-false', field: 'created', rev: false, name: 'Oldest created' },
    { id: '4-body.length-true', field: 'body.length', rev: true, name: 'Longest' },
    { id: '5-body.length-false', field: 'body.length', rev: false, name: 'Shortest' },
    { id: '6-tags.length-true', field: 'tags.length', rev: true, name: 'Most Tags' },
    { id: '7-tags.length-false', field: 'tags.length', rev: false, name: 'Fewest tags' }
    // @TODO: query match strength
    // @NOTE: changes to the fields might require changes to the noteSort filter
  ];

  private _logger: Logger = new Logger(this.constructor.name);
  private dataService: DataService;

  constructor(
    public tagsService: TagsService
  ) {
    this.index = lunr(function() {
      // this.field('title', {boost: 10});
      this.field('tags', {boost: 100});
      this.field('body', {boost: 1});
      this.ref('id');
    });
  }

  init(notesData: Object, dataService: DataService) {
    this.dataService = dataService;

    this._logger.time('initializing notes and index');
    _.each(notesData, _.partialRight(this.createNote, true).bind(this));
    this._logger.timeEnd('initializing notes and index');

    this.initialized$.next(null);

    this._logger.log('got', _.size(this.notes), 'notes');
  }

  createNote(noteObj: any = {}, isInit = false): Note {
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

    if (isInit) {
      // This note exists in data store already, we're just initializing local data on app load. We can assume that stuff that happens on update (upload, run prog tags, etc.) has been done and persisted to data store, and that tag data is synced with tags on notes etc. We just have to add it to the index since build index anew on each app load.
      this.updateNoteInIndex(newNote);
    }
    else {
      newNote.updated();

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
  doQuery(query = '', tags?: Tag[]): Note[] {
    this._logger.time('doing query');

    this._logger.log('queried "' + query + '" with tags', tags);

    // Arrays of note id's:
    var filteredByTags: string[], filteredByString: string[], filteredByPrivate: string[];

    // FIRST get the docs filtered by tags
    if (tags && tags.length) {
      filteredByTags = _.intersection(... tags.map(tag => tag.docs));

      if (filteredByTags.length === 0) {
        // no notes match this combination of tags, so we're done:
        return this.noQueryResults();
      }
    }

    // NEXT get the docs filtered by any string
    if (query && query.length > 2) { // only start live searching once 3 chars have been entered
      var results = this.index.search(query); // by default ANDs spaces: "foo bar" will search foo AND bar
      // results is array of objects each containing `ref` (note id) and `score`
      // ignoring score for now
      filteredByString = results.map((doc) => doc.ref); // gives us an array

      if (filteredByString.length === 0) {
        // no notes have this string, so we're done:
        return this.noQueryResults();
      }
    }

    // @TODO/rewrite
    // ALSO check private notes
    // @TODO would probably be faster to filter the inverse and subtract from other lists? because probably few private notes
    // if (! $s.p.privateMode && $s.n.nuts && ! _.isEmpty($s.n.nuts)) {
    //   // private mode off, so hide private notes. get array of note IDs that aren't private:
    //   filteredByPrivate = (_.filter($s.n.nuts, function(nut) { return !nut.private; })
    //                         .map(function(nut) { return nut.id; }) );

    //   if (filteredByPrivate.length === 0) {
    //     // *every* note is private (and private mode is off), so we're done:
    //     return $s.q.noQueryResults();
    //   }
    //   else if (filteredByPrivate.length === _.keys($s.n.nuts).length) {
    //     filteredByPrivate = null; // ignore
    //   }
    // }

    var filteredNotes;
    var filterArrays = [];
    if (filteredByTags) filterArrays.push(filteredByTags);
    if (filteredByString) filterArrays.push(filteredByString);
    if (filteredByPrivate) filterArrays.push(filteredByPrivate);

    if (filterArrays.length) {
      var filteredNoteIds = _.intersection(...filterArrays);

      // now build an array pointing to just the nuts that we want to display
      filteredNotes = _.map(filteredNoteIds, (noteId: string) => this.notes[noteId]);
    }
    else {
      // show all
      filteredNotes = this.notes;
    }

    // @TODO/rewrite - i think these are handled by whoever called the query?
    // $s.n.sortNuts($s.n.sortOpts[$s.c.config.nutSortBy], filteredNotes); // re-sort, cause who knows what we've added into `$s.n.nuts` (sortNuts also autosizes textareas)
    // $s.n.moreNutsCheck(); // new query may mean we have to increase/decrease limit

    this._logger.timeEnd('doing query');

    return filteredNotes;
  }

  /** Call if no results during `doQuery` */
  noQueryResults(): Array<Note> {
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
  sortNotes(sortOpt?, notesToSort?): Note[] {
    if (! notesToSort) notesToSort = this.notes;
    if (! notesToSort || notesToSort.length === 0) return [];

    if (! sortOpt) {
      // Just get the "first" sort option
      sortOpt = this.sortOpts[0];
    }

    this._logger.time('Sorting notes');
    this._logger.log('Sorting notes by', sortOpt);

    var sortedNotes;

    if (sortOpt.field.indexOf('.') !== -1 ) { // e.g. field might be `tags.length`
      var fields = sortOpt.field.split('.');

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

    if (sortOpt.rev) sortedNotes.reverse();

    this._logger.timeEnd('Sorting notes');

    return sortedNotes;
  }

  /**
   * Returns an array of Notes run through both query filtering and sorting.
   */
  getNotes(query = '', queryTags?: Tag[], sortOpt?, notesToSort?: Note[]): Note[] {
    return this.sortNotes(sortOpt, this.doQuery(query, queryTags));
  }
}
