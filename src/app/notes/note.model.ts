import {EventEmitter} from '@angular/core';

import {Logger} from '../utils/logger';

import {DataService} from '../';

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

      // @TODO/rewrite/config @TODO/rewrite/tags
      // if ($s.c.config.nutChangesChangeTagModifiedTimestamp && this.tags) {
      //   this.tags.forEach(function (tagId) {
      //     $s.t.tagUpdated(tagId, false, true);
      //   });
      // }
    }

    if (fullUpdate) {
      this.doFullUpdate();
    }

    this._logger.log('Updated');

    this.dataService.digest$.emit(this);
  }

  /** Outputs object of properties that we want to save to the data store. */
  forDataStore(): Object {
    const noteData = {};

    // @TODO/rewrite Does sending `undefined` for a property to firebase remove it? Should we send null? Should we ignore undefined or falsey properties? Etc.
    this.DATA_PROPS.forEach((prop) => {
      noteData[prop] = this[prop];
    });

    return noteData;
  }

  /**
   * 1. Updates lunr index. Note: this can be slow: 0.5s for 40k char text on one machine).
   * 2. Runs through all programmatic tags. Might be slow depending on user functions.
   */
  doFullUpdate(): void {
    this._logger.log('Doing full update');

    this.dataService.notes.updateNoteInIndex(this);

    // @TODO/rewrite/prog
    // $s.n.runProgTags(nut);

    delete this.fullUpdateRequired;
  }

  removeTag(tagId: string, fullUpdate = true): void {
    this.tags = _.without(this.tags, tagId);

    this.dataService.tags.tags[tagId].removeNote(this.id);

    this.rebuildNoteSharing();
    // @TODO/rewrite/config first param should reflect config.tagChangesChangeNutModifiedTimestamp
    this.updated(true, fullUpdate);
  }

  rebuildNoteSharing() {
    // @TODO/rewrite
  }
}
