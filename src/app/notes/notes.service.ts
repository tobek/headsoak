import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import {Logger, utils} from '../utils/';

import {Note} from './';

@Injectable()
export class NotesService {
  notes: Map<string, Note>; // id -> Note instance
  updates$: Subject<void>;

  /**
   * Key format: `[desiredOrder] + '-' + field + '-' + rev`
   * @NOTE: changing these keys will break things for users who have ever manually changed the sort and thus have that key saved in their config.
   */
  sortOpts = {
    '0-modified-true': { field: 'modified', rev: true, name: 'Recently modified' },
    '1-modified-false': { field: 'modified', rev: false, name: 'Oldest modified' },
    '2-created-true': { field: 'created', rev: true, name: 'Recently created' },
    '3-created-false': { field: 'created', rev: false, name: 'Oldest created' },
    '4-body.length-true': { field: 'body.length', rev: true, name: 'Longest' },
    '5-body.length-false': { field: 'body.length', rev: false, name: 'Shortest' },
    '6-tags.length-true': { field: 'tags.length', rev: true, name: 'Most Tags' },
    '7-tags.length-false': { field: 'tags.length', rev: false, name: 'Fewest tags' }
    // @TODO: query match strength
    // @NOTE: changes to the fields might require changes to the noteSort filter
  };

  private _logger: Logger = new Logger(this.constructor.name);

  constructor() {
    this.updates$ = new Subject<void>();
  }

  init(notes) {
    // Firebase stores as objects but if data is "array-like" then we get back arrays. we need objects because we may have non-numeric keys, and because we migrated to string keys. TODO may not be necessary in the future, see also idsMigrated which was done at the same time
    var notesObj: Object = utils.objFromArray(notes) || {};

    this.notes = <Map<string, Note>>(_.mapValues(
      notesObj, (note) => new Note(note)
     ));

    // @TODO/rewrite
    // console.time("initializing lunr index");
    // _.each($s.n.nuts, $s.n.updateNutInIndex);
    // console.timeEnd("initializing lunr index");

    this.updates$.next(null);

    // this._logger.log('got notes', this.notes);
    this._logger.log('got', notes.length, 'notes');
  }

  createNote(noteObj) {
    if (noteObj.id) {
      if (this.notes[noteObj.id]) {
        throw new Error('Cannot create a new note with id (' + noteObj.id + ') - already taken!');
      }
    }
    else {
      noteObj.id = utils.getUnusedKeyFromObj(this.notes);
    }

    this.notes[noteObj.id] = new Note(noteObj);
  }

  /**
   * Returns array of notes (either all notes or a passed-in subset) sorted according to given criteria.
   * 
   * Note that we don't want sort order updating *while* you're editing some property that we're sorting on, e.g. you're sorting on recently modified and as you start typing, that note shoots to the top. So we need to control this separately and only change order when we want to.
   */
  sortNotes(sortOpt?, notesToSort?): Array<Note> {
    if (! notesToSort) notesToSort = this.notes;
    if (! notesToSort) return;

    if (! sortOpt) {
      // Just get the "first" sort option
      sortOpt = this.sortOpts[_.keys(this.sortOpts)[0]];
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
    // @NOTE: Here is a more generic way to deal with this indexing of sub-objects by dot-notation string: http://stackoverflow.com/a/6394168

    if (sortOpt.rev) sortedNotes.reverse();

    this._logger.timeEnd('Sorting notes');

    return sortedNotes;
  }
}
