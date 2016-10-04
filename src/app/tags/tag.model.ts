import {DataService} from '../';

import {Logger} from '../utils/logger';

import {Note} from '../notes/';

/** Information this tag generates about a specific note. */
type NoteDataType = {
  subTag?: string, // will be displayed after tag name when shown on this note, e.g. for sentiment analysis tag called "sentiment", `val` might be "joy" and be displayed as "sentiment: joy"
  score?: any, // in addition to `val`, this will be displayed in parentheses after tag name on hover, e.g. `valHover` might be "90% confidence" and show "sentiment: joy (90% confidence)" @TODO/prog Update component and this comment: f no subTag, show score always w ithout hover
  more?: string, // additional stuff can be displayed in the dropdown (unimplemented)
};

export class Tag {
  /** By convention, IDs for user's own tags are numeric strings. Other tags (previously, shared ones, currently only library tags) have other IDs like `lib--untagged`. */
  id: string;

  name: string;
  created: number;
  modified: number;

  docs: string[] = []; // array of note IDs

  description?: string;
  prog?: boolean; // whether it's a programmatic tag
  progFuncString?: string; // string representing programmatic ta@Tg function to be eval'd. This ccould be present even though `prog` is false, saving the function for potential future use.
  readOnly?: boolean; // @TODO/sharing handle other permissions

  share?: any; // map of recipient (shared-with) user ID to their permissions
  sharedBy?: string; // ID of user that shared this tag
  shareTooltip?: string; // text to identify sharing status to user (e.g. "you are sharing this with ___" or "___ is sharing this with you")

  isLibraryTag?: boolean;

  /** Tag can store specific information on a per-note basis, indexed by note ID. */
  noteData: { [key: string]: NoteDataType } = {};

  /** Tags (currently only prog tags) can have sub tags. This index maps subTag name to list of Note IDs, so that we can both get a list of all possible subtags, and sort easily. */
  subTagDocs?: { [key: string]: string[] } = {};

  /** If this is a programmatic tag, this property caches the function that is run to determine if a note should have this tag. */
  private classifier: (note: Note) => boolean | NoteDataType;

  /** Properties that we save to data store */
  private DATA_PROPS = [
    'id',
    'name',
    'created',
    'modified',
    'description',
    'docs',

    'prog',
    'progFuncString',
    'isLibraryTag',
    'noteData',
    'subTagDocs',

    'readOnly',
    'share',
    'sharedBy',
  ];

  protected _logger: Logger;

  // @TODO how do we handle duplicate names?
  constructor(tagData: any, public dataService: DataService) {
    if (! tagData.id) {
      throw new Error('Must supply tag with id');
    }

    _.extend(this, tagData);

    this._logger = new Logger('Tag ' + this.id);

    _.defaults(this, {
      docs: [],
      created: Date.now(),
      modified: Date.now(),
    });

    // @TODO/old if `docs` exists, go through and add to each nut?

    // @TODO/rewrite/tags
    // this.tagUpdated(newId);
  }

  /** Outputs object of properties that we want to save to the data store. */
  forDataStore(): Object {
    const tagData = {};

    // @NOTE A value must be set to `null` to remove from Firebase. undefined isn't allowed.
    this.DATA_PROPS.forEach((prop) => {
      if (this[prop] !== undefined) {
        tagData[prop] = this[prop];
      }
    });

    return tagData;
  }

  updated(updateModified = true): void {
    if (updateModified) {
      this.modified = Date.now();
    }

    this._logger.log('Updated');

    this.dataService.digest$.emit(this);
  }

  rename(newName: string): void {
    this._logger.log('Renaming to:', newName);
    this.name = newName;
    this.updated();
  }

  /** Returns true if tag was deleted. */
  delete(noConfirm = false): boolean {
    if (! noConfirm && ! confirm('Are you sure you want to delete the tag "' + this.name + '"? It will be removed from all notes which have this tag, but the notes will remain.\n\nThis can\'t be undone.')) {
      return false;
    }

    this.prog = false; // so that we don't get added back by any programmatic logic when updating note while removing ourselves

    // this.docs.slice() returns a duplicate of the array which is necessary because note.removeTag will call tag.removeNoteId which will modify the array we're iterating over.
    this.docs.slice().forEach((noteId) => {
      this.dataService.notes.notes[noteId].removeTag(this, true, true);
    });

    // @TODO/rewrite/sharing
    // if (this.share && ! this.sharedBy) {
    //   // Shared tag that is shared by the current user
    //   $s.t.unshareTagWithAll(tag);
    // }

    this.dataService.tags.removeTag(this);

    this._logger.log('Deleted');

    if (this.isLibraryTag) {
      // Tag no longer lives in this.tags but is still referenced by prog tag library and could be used again, so:
      this.docs = []; // makes for cleaner update if user adds tag back in this session
      this.prog = true; // need this back!
    }

    return true;
  }

  /** @NOTE This does *not* add ourselves to the note in return. */
  addNoteId(noteId: string): void {
    this._logger.log('Adding note id', noteId);
    this.docs = _.union(this.docs, ['' + noteId]);
    this.updated();
  }
  /** @NOTE This does *not* remove ourselves from the note in return. */
  removeNoteId(noteId: string): void {
    this._logger.log('Removing note id', noteId);
    _.pull(this.docs, '' + noteId);

    if (this.noteData[noteId]) {
      const noteSubTag = this.noteData[noteId].subTag;
      if (noteSubTag) {
        _.pull(this.subTagDocs[noteSubTag], noteId);
      }

      delete this.noteData[noteId];
    }

    this.updated();
  }

  updateProgFuncString(newFuncString: string): void {
    delete this.classifier; // will be regenerated next time we need it
    this.progFuncString = newFuncString;
  }

  /** See if given note should be tagged by this programmatic tag. */
  runProgOnNote(note: Note): void {
    if (! this.prog || ! this.progFuncString) {
      this._logger.warn('Can\'t run prog tag on note - this tag is not programmatic or has no programmatic function string!', this);
      return;
    }

    if (note.new) {
      // Unsaved empty note
      return;
    }

    if (! this.classifier) {
      this.classifier = this.generateClassifier();
    }

    const result = this.classifier(note);

    if (result === true) {
      this._logger.log('User classifier returned true for note ID', note.id);
      note.addTag(this, true, true);
    }
    else if (result) {
      this._logger.log('User classifier returned true for note ID', note.id, 'and noteData', result);

      this.noteData[note.id] = result;

      if (result.subTag) {
        this.subTagDocs[result.subTag] = _.union(this.subTagDocs[result.subTag], [note.id]);
      }

      if (note.hasTag(this)) {
        // No need to add to note but we still have to update tag to save new noteData. @TODO/prog Check if noteData has changed before updating
        this.updated();
      }
      else {
        note.addTag(this, true, true);
      }
    }
    else {
      this._logger.log('User classifier returned false for note ID', note.id);
      // Eventually, this will call `this.removeNoteId` which will handle `noteData` and sub tags
      note.removeTag(this, true, true);
    }
  }

  runProgOnAllNotes(): void {
    if (! this.prog || ! this.progFuncString) {
      this._logger.warn('Can\'t run prog tag on notes - this tag is not programmatic or has no programmatic function string!', this);
      return;
    }

    this._logger.log('Running smart tag on all notes');
    this._logger.time('Ran smart tag on all notes in');
    console.groupCollapsed();

    _.each(this.dataService.notes.notes, this.runProgOnNote.bind(this));

    console.groupEnd();
    this._logger.timeEnd('Ran smart tag on all notes in');
  }

  generateClassifier(): (note: Note) => boolean {
    var classifierFunc = new Function('note', 'api', '_', this.progFuncString); // this line excites me

    // The function we actually call needs to be wrapped in try/catch and supplied with the API and other stuff
    return (note: Note): boolean => {
      try {
        // Passing in this tag as the this arg
        return classifierFunc.call(this, note, this.dataService.tags.progTagApi, _);
      }
      catch (err) {
        this.progTagError(err, note);
      }
    }
  }

  progTagError(err: Error, note: Note) {
    this._logger.error('Running programmatic tag on note ID', note.id, 'threw error:', err, err.stack, 'Tag prog function string:', this.progFuncString);

    // @TODO/prog

    alert('Hey there was an unhandled error running smart tags, leave this page up and show toby please.');

    // // closeModal may have been just called, so open up new modal in a different tick:
    // $timeout(function() {
    //   $s.m.confirm({
    //     bodyHTML: '<p>There was an error when running your function for tag "' + tag.name  + '":</p><pre>  ' + err + '</pre><p>Would you like to change this tag\'s function or revert to normal tag?</p>',
    //     okText: 'change function',
    //     okCb: function() {
    //       // closeModal may have been just called, so...
    //       $timeout(function() {
    //         $s.t.tagProgSettings(tag);
    //       }, 50);
    //     },
    //     cancelText: 'revert tag',
    //     cancelCb: function() {
    //       tag.prog = false;
    //       $s.t.tagUpdated(tag);
    //     },
    //     large: true,
    //   });
    // }, 50);
  }
}
