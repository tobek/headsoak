import {EventEmitter} from '@angular/core';

import {Logger} from '../utils/logger';

import {DataService} from '../';
import {Tag} from '../tags';

export class Note {
  id: string;
  body: string;
  created: number;
  modified: number;

  // Optional:
  fullUpdateRequired: Boolean;
  readOnly: Boolean;
  share: { [uid: string]: boolean };
  sharedBy: string;
  sharedBody: string;
  tags: string[]; // Array of tag IDs

  /** Currently used to a) hide new/unsaved notes from browser, and b) distinguish a new note with empty body from old note with empty body for the purposes of placeholder text. */
  new = false;

  /** Temporary flag attached to note model as it's passed around, indicating that it's about to be deleted. */
  deleted = false;

  /** Hold interval for checking if we should sync note body while it's focused. */
  private nutSaver: number;

  /** Stores what the note body was before focusing, in order to determine, upon blurring, whether anything has changed. */
  private oldBody: string;

  private _logger: Logger;

  /** Properties that we save to data store */
  private DATA_PROPS = [
    'id',
    'body',
    'created',
    'modified',
    'fullUpdateRequired',
    'readOnly',
    'share',
    'sharedBy',
    'tags',
  ];

  constructor(noteData: any, private dataService: DataService) {
    if (! noteData.id) {
      throw new Error('Must supply a note id');
    }

    _.extend(this, noteData);

    this._logger = new Logger('Note ' + this.id);

    // @TODO/rewrite
    // // if we've specifically passed in tags on this nut, use those. otherwise, maybe use query-filtering tags
    // if (! nut.tags && $s.c.config.addQueryTagsToNewNuts && $s.q.tags && $s.q.tags.length > 0) {
    //   nut.tags = $s.q.tags.filter(function(tagId) {
    //     // remove prog and readOnly tags
    //     return (! $s.t.tags[tagId].prog && ! $s.t.tags[tagId].readOnly);
    //   })
    // }

    _.defaults(this, {
      body: '',
      tags: [],
      created: Date.now(),
      modified: Date.now(),
      // history: [], // an array of notes, last is the latest
    });

    // @TODO/rewrite/tags
    // if (this.tags && this.tags.length > 0) {
    //   // Add this doc id to each of the tags
    //   this.tags.forEach(function(tagId){
    //     $s.n.addTagIdToNut(tagId, this.id);
    //   });
    // }

    // @TODO/rewrite
    // // If user was disconnected while editing a note, we won't have done a full update (which we only do on blur), so do that now
    // if (this.fullUpdateRequired) {
    //   console.log('note ' + this.id + ' was saved but requires a full update');
    //   $s.n.noteDoFullUpdate(note);
    // }

    // @TODO/rewrite
    // this.nutUpdated(newId); // saves state in history, updates index, etc.

    // @TODO/rewrite
    // // ensure that the new nut is visible and on top regardless of sort or search query
    // $s.n.nutsDisplay.unshift($s.n.nuts[newId]);

    // @TODO/rewrite - do we want these here?
    // $s.n.focusOnNutId(newId);
    // $s.n.autosizeAllNuts();

    // console.log('New note created:', this);
  }

  /**
   * Call whenever a nut is updated - for instance, when note textarea blurs or when tags added/removed
   *
   * 1. Updates history. @NOTE: we store entire state of nut in each history entry. could instead store just changes if this gets to big. @NOTE: by the time this is called, the view and model have already changed. we are actually storing the CHANGED version in history. @NOTE: this is disabled for now
   * 2. Updates `modified` (default - pass false in as updateModified to disable)
   * 3. Does "full update" see doFullUpdate() (default - pass false in as fullUpdate to disable)
   * 4. Adds to digest to be saved to data store
   */
  updated(updateModified = true, fullUpdate = true): void {
    this.new = false;

    // History disabled for now
    // if ($s.c.config.maxHistory > 0) {
    //   // @TODO history is a bit overzealous. this function can get called every second. at the very least, history should only be separated when the note blurs. or it could even be by session. and should maybe be stored separately from the note so that not EVERY SINGLE push sends whole history
    //   let oldState = _.extend({}, this); // deep clone ourself
    //   delete oldState.history; // no need for the history to have history
    //   this.history.push(oldState); // append clone into history
    //   if (this.history.length > $s.c.config.maxHistory) {
    //     this.history.shift(); // chuck the oldest one
    //   }
    // }
    // else if (this.history) {
    //   // TEMPORARY: while feature is disabled, delete any pre-existing history
    //   delete this.history;
    // }

    if (updateModified) {
      this.modified = Date.now();
    }

    if (fullUpdate) {
      this.doFullUpdate(updateModified);
    }

    this._logger.log('Updated');

    this.dataService.digest$.emit(this);
  }

  /** Outputs object of properties that we want to save to the data store. */
  forDataStore(): Object {
    const noteData = {};

    // @NOTE A value must be set to `null` to remove from Firebase. undefined isn't allowed.
    this.DATA_PROPS.forEach((prop) => {
      if (this[prop] !== undefined) {
        noteData[prop] = this[prop];
      }
    });

    return noteData;
  }

  /**
   * 1. Updates timestamps of attached tags, if appropriate
   * 2. Updates lunr index. Note: this can be slow: 0.5s for 40k char text on one machine).
   * 3. Runs through all programmatic tags. Might be slow depending on user functions.
   */
  doFullUpdate(updateModified = true): void {
    this._logger.log('Doing full update');

    if (updateModified && this.dataService.settings.get('nutChangesChangeTagModifiedTimestamp')) {
      this.tags.forEach((tagId: string) => {
        this.dataService.tags.tags[tagId].updated();          
      });
    }

    this.dataService.notes.updateNoteInIndex(this);

    // @TODO/rewrite/prog
    // $s.n.runProgTags(nut);

    delete this.fullUpdateRequired;

    this.dataService.notes.noteUpdated$.next(this);
  }

  focused(): void {
    this._logger.log('Focused');

    this.oldBody = this.body;
    clearInterval(this.nutSaver);

    this.nutSaver = setInterval(this.maybeUpdate.bind(this), 5000);
  }

  blurred(): void {
    this._logger.log('Blurred');

    this.maybeUpdate(true);
    clearInterval(this.nutSaver);
  }

  maybeUpdate(blurred = false): void {
    let bodyChanged = this.oldBody !== this.body;

    if (blurred && (this.fullUpdateRequired || bodyChanged)) {
      // We don't update index/prog tags/etc while typing/focused because it can be slow. If there was any change detected while focused, we have to do that now
      this._logger.log('Note has changed since focus');
      this.updated(bodyChanged, true);
    }

    if (this.oldBody !== this.body) {
      this._logger.log('Note changed!');

      this.fullUpdateRequired = true; // We haven't blurred now, so we're not doing full update. Need to make sure we full update (update lunr index and prog tags) later even if nut is unchanged by the time we blur. This persists to database too so that even if we're disconnected, the change will be done later.

      this.updated(true, false);

      this.oldBody = this.body;
    }
  }

  changed(): void {
    this.dataService.status = 'unsynced';

    // @TODO/rewrite/notes Need to autosize note?
  }

  /** Finds or creates tag, adds to note, and returns it. Returns null if no tag added. */
  addTagFromText(tagName: string, fullUpdate = true): Tag {
    this._logger.log('Adding tag from string:', tagName);

    let tag = this.dataService.tags.getTagByName(tagName);

    if (! tag) {
      this._logger.log('Have to create new tag with name:', tagName);

      tag = this.dataService.tags.createTag({ name: tagName });
    }

    return this.addTag(tag);
  }

  /** Adds tag to note and returns tag, or returns null if no tag added. */
  addTag(tag: Tag, fullUpdate = true, viaProg = false): Tag {
    this._logger.log('Adding tag', tag);

    if (tag.readOnly) {
      if (! confirm('The tag "' + tag.name + '" is a tag that has been shared with you and is read-only. Do you want to create a new tag in your account with this name and add it to this note?')) {
        return null;
      }
    }
    if (tag.prog && ! viaProg) {
      this.progTagCantChangeAlert(tag);
      return null;
    }

    this.tags = _.union(this.tags, [tag.id]);
    tag.addNoteId(this.id);

    this.rebuildNoteSharing();

    this.updated(this.dataService.settings.get('tagChangesChangeNutModifiedTimestamp'), fullUpdate);

    return tag;
  }

  removeTagId(tagId: string, fullUpdate = true): void {
    this.removeTag(this.dataService.tags.tags[tagId], fullUpdate);
  }

  removeTag(tag: Tag, fullUpdate = true, viaProg = false): void {
    this._logger.log('Removing tag', tag);

    if (tag.prog && ! viaProg) {
      this.progTagCantChangeAlert(tag);
      return;
    }

    this.tags = _.without(this.tags, tag.id);
    tag.removeNoteId(this.id);

    this.rebuildNoteSharing();
    this.updated(this.dataService.settings.get('tagChangesChangeNutModifiedTimestamp'), fullUpdate);
  }

  progTagCantChangeAlert(tag: Tag): void {
    // @TODO/rewrite See `progTagCantChangeAlert` in old code - prompt should allow user to change this tag's settings
    alert('The tag "' + tag.name + '" is an algorithmic tag, so it can\'t be added or removed manually.');
  }

  showShareSettings() {
    alert('not yet!');
  }

  rebuildNoteSharing() {
    // @TODO/rewrite
  }

  togglePrivate() {
    alert('not yet!');
  }

  /** Returns true if note was deleted. */
  delete(noConfirm = false): boolean {
    let confirmMessage = 'Are you sure you want to delete this note? This can\'t be undone.';
    if (this.body) {
      confirmMessage += '\n\nIt\'s the note that goes like this: "';
      if (this.body.length > 100) {
        confirmMessage += this.body.substr(0, 100) + '...';
      }
      else {
        confirmMessage += this.body;
      }
      confirmMessage += '"';
    }

    if (! noConfirm && ! confirm(confirmMessage)) {
      return false;
    }

    this.deleted = true;

    if (this.tags) {
      this.tags.forEach((tagId) => {
        this.dataService.tags.tags[tagId].removeNoteId(this.id);
      });
    }

    this.dataService.notes.noteUpdated$.next(this);
    this.dataService.notes.removeNote(this);

    // @TODO/rewrite/sharing Do we need to do anything with sharing?

    // @TODO/rewrite need to do something like this otherwise it's still visible
    // $s.q.doQuery();

    this._logger.log('Deleted');

    return true;
  }
}
