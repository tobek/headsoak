import {EventEmitter} from '@angular/core';

import {Logger} from '../utils/logger';

import {DataService} from '../data.service';
import {Tag} from '../tags';

import * as _ from 'lodash';

export class Note {
  id: string;
  
  body = '';

  created = Date.now(); // doesn't actually get called til object is instantiated so time is correct (and of course can be overridden by data passed to constructor)
  modified = Date.now();

  fullUpdateRequired?: Boolean;
  readOnly?: Boolean;
  share?: { [uid: string]: boolean };
  sharedBy?: string;
  sharedBody?: string;
  tags: string[] = []; // Array of tag IDs
  private?: boolean;

  // history: Note[], // an array of notes, last is the latest

  /** Currently used to a) hide new/unsaved notes from note browser, and b) distinguish a new note with empty body from old note with empty body for the purposes of placeholder text. As soon as a note has any content or changes at all, it gets saved to data store and is marked as no longer new. */
  new = false;

  /** Temporary flag attached to note model as it's passed around, indicating that it's about to be deleted. */
  deleted = false;

  /** @HACK Temporary flag attached to note model as it gets passed to `NoteQueryComponent` via `noteUpdated`, indicating that some property changed (e.g. pinning or archiving) so sort should be updated. This is NOT used when other possibly-sort-dependent properties have changed, such as body length, # of tags, or timestamps, so as not to whip out a note from under a user's nose while they're editing it. `NoteQueryComponent` sets it back to false when it sees it. */
  updateSortHack = false;

  /** Hold interval for checking if we should sync note body while it's focused. */
  private nutSaver?: number;

  /** Stores what the note body was before focusing, in order to determine, upon blurring, whether anything has changed. */
  private oldBody?: string;

  /** Used to prevent infinite loops when running prog tags.*/
  private progTagDepth = 0;

  private _logger: Logger;

  /** Properties that we save to data store. The ordering is also the order in which data is shown in the explore note raw data dropdown. */
  static DATA_PROPS = [
    'id',
    'tags',
    'created',
    'modified',
    'fullUpdateRequired',
    'private',
    'readOnly',
    'share',
    'sharedBy',
    'body',
  ];

  constructor(noteData: any, private dataService: DataService) {
    if (! noteData.id) {
      throw new Error('Must supply a note id');
    }

    _.extend(this, noteData);

    this._logger = new Logger('Note ' + this.id);

    this.oldBody = this.body;

    // @TODO/rewrite @TODO/now maybe we do this in NotesService.createNote
    // // If user was disconnected while editing a note, we won't have done a full update (which we only do on blur), so do that now
    // if (this.fullUpdateRequired) {
    //   console.log('note ' + this.id + ' was saved but requires a full update');
    //   $s.n.noteDoFullUpdate(note);
    // }

    // console.log('New note created:', this);
  }

  get pinned(): boolean {
    return this.getFromInternalTag(Tag.INTERNAL_TAG_DATA.PINNED.id);
  }
  set pinned(newVal: boolean) {
    if (newVal) {
      this.archived = false;
    }
    this.setToInternalTag('pinned', Tag.INTERNAL_TAG_DATA.PINNED.id, newVal);

    this.updateSortHack = true;
  }
  get archived(): boolean {
    return this.getFromInternalTag(Tag.INTERNAL_TAG_DATA.ARCHIVED.id);
  }
  set archived(newVal: boolean) {
    if (newVal) {
      this.pinned = false;
    }
    this.setToInternalTag('archived', Tag.INTERNAL_TAG_DATA.ARCHIVED.id, newVal);
    
    this.updateSortHack = true;
  }

  getFromInternalTag(tagId: string): boolean {
    return _.includes(this.tags, tagId);
  }
  setToInternalTag(propName: string, tagId: string, newVal: boolean) {
    if (newVal && ! this[propName]) {
      this.addTagById(tagId);
    }
    else if (! newVal && this[propName]) {
      this.removeTagId(tagId);
    }
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
    if (this.new) {
      this.new = false;

      // Also, for any tags we put on here, we haven't actually updated the tag models with this note, so do that now.
      this.tags.forEach((tagId: string) => {
        this.dataService.tags.tags[tagId].addNoteId(this.id);          
      });
    }

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
    Note.DATA_PROPS.forEach((prop) => {
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
   *
   * @TODO/optimization This should be debounced (while preserving any true `updatedModified` argument). Some scenarios cause multiple full udpates in a row. (One example: archiving a pinned note removes pinned tag and adds archived tag - both do full updates).
   */
  doFullUpdate(updateModified = true): void {
    this._logger.log('Doing full update');

    if (updateModified && this.dataService.settings.get('nutChangesChangeTagModifiedTimestamp')) {
      this.tags.forEach((tagId: string) => {
        this.dataService.tags.tags[tagId].updated();          
      });
    }

    this.dataService.notes.updateNoteInIndex(this);

    this.runProgTags();

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
    const bodyChanged = this.oldBody !== this.body;

    if (blurred && (this.fullUpdateRequired || bodyChanged)) {
      // We don't update index/prog tags/etc while typing/focused because it can be slow. If there was any change detected while focused, we have to do that now
      this._logger.log('Note has changed since focus. Was `' + this.oldBody + '`, now is `' + this.body + '`');
      
      this.updated(bodyChanged, true);

      this.oldBody = this.body;
    }
    else if (bodyChanged) {
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

    // Exclude library tags here cause that'll get caught by `tag.prog` check in `addTag()` @TODO/share This logic hasn't been tested since we don't have sharing yet
    if (tag && tag.readOnly && ! tag.isLibraryTag) {
      if (! confirm('The tag "' + tag.name + '" is a tag that has been shared with you and is read-only. Do you want to create a new tag in your account with this name and add it to this note?')) {
        return null;
      }
      else {
        tag = null; // we'll create a new one
      }
    }

    if (! tag) {
      this._logger.log('Have to create new tag with name:', tagName);

      tag = this.dataService.tags.createTag({ name: tagName }, true);
    }

    return this.addTag(tag);
  }

  /** Just looks up tag in `TagsService` and calls `addTag` - throws an error if tag not found. */
  addTagById(tagId: string, fullUpdate = true, evenIfProg = false): Tag {
    const tag = this.dataService.tags.tags[tagId];

    if (! tag) {
      throw new Error('No tag with id "' + tagId + '" found.');
    }

    return this.addTag(tag, fullUpdate, evenIfProg);
  }

  /** Adds tag to note and returns tag, or returns null if no tag added. Also updates the tag as necessary. */
  addTag(tag: Tag, fullUpdate = true, evenIfProg = false): Tag {
    if (this.hasTag(tag)) {
      return null;
    }

    this._logger.log('Adding tag', tag);

    if (tag.prog && ! evenIfProg) {
      this.progTagCantChangeAlert(tag);
      return null;
    }

    if (! tag.prog && ! tag.internal) {
      // Add at the front - this makes tags on notes ordered by most-recently-added, which a) is fine, and b) looks good when you add a new tag. Later order could be smarter.
      this.tags.unshift('' + tag.id);
    }
    else {
      // We'll leave prog and internal tags at the back
      this.tags.push('' + tag.id);
    }

    tag.addNoteId(this.id);

    this.rebuildNoteSharing();

    this.updated(this.dataService.settings.get('tagChangesChangeNutModifiedTimestamp'), fullUpdate);

    return tag;
  }

  hasTag(tag: Tag): boolean {
    return _.includes(this.tags, '' + tag.id);
  }

  removeTagId(tagId: string, fullUpdate = true, evenIfProg = false): void {
    this.removeTag(this.dataService.tags.tags[tagId], fullUpdate, evenIfProg);
  }

  /** Removes tag from note. Also updates the tag as necessary. */
  removeTag(tag: Tag, fullUpdate = true, evenIfProg = false): void {
    if (! _.includes(this.tags, '' + tag.id)) {
      return;
    }

    if (tag.prog && ! evenIfProg) {
      this.progTagCantChangeAlert(tag);
      return;
    }

    this._logger.log('Removing tag', tag);

    _.pull(this.tags, '' + tag.id);
    tag.removeNoteId(this.id);

    this.rebuildNoteSharing();
    this.updated(this.dataService.settings.get('tagChangesChangeNutModifiedTimestamp'), fullUpdate);
  }

  progTagCantChangeAlert(tag: Tag): void {
    this.dataService.modalService.modal.generic({
      message: 'The tag "' + tag.name + '" is a smart tag, so it can\'t be added or removed manually.',
      additionalButtons: [
        {
          text: 'Change tag settings',
          cb: () => {
            tag.goTo('smartness');
          }
        }
      ],
    });
    // @TODO/rewrite Maybe should explain smart tags (specifically this *type* of smart tag - with auto application), etc.
  }

  showShareSettings() {
    alert('not yet!');
  }

  rebuildNoteSharing() {
    // @TODO/sharing
  }

  togglePrivate() {
    this.private = ! this.private;
    this.updated(false, true);

    if (this.private && ! this.dataService.accountService.privateMode) {
      this.dataService.toaster.info(
        '<p>Since you do not currently have private mode enabled, this note will be hidden from view.<p></p>Click to enable private mode.</p>',
        'Note made private',
        {
          preventDuplicates: true,
          timeOut: 7500,
          onclick: () => {
            this.dataService.modalService.privateMode();
          },
        }
      );
      // @TODO/ece If this is the "open" note then we do *not* hide it. So in that case we should either a) simply not show this message, b) do actually hide the note, and show this message, or c) show a different message (like 'when you close this note it'll be invisible...'')
    }
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

    if (this.dataService.activeUIs.focusedNoteComponent && this.dataService.activeUIs.focusedNoteComponent.note === this) {
      this.dataService.activeUIs.focusedNoteComponent = null;
    }

    // @TODO/rewrite/sharing Do we need to do anything with sharing?

    // @TODO/rewrite need to do something like this otherwise it's still visible
    // $s.q.doQuery();

    this._logger.log('Deleted');

    return true;
  }

  runProgTags(): void {
    this._logger.log('Running smart tags');
    this._logger.time('Ran smart tags in');
    console.groupCollapsed();

    this.progTagDepth++;

    if (this.progTagDepth > 5) {
      // Example infinite loop: a poorly programmed "untagged" tag. Adds itself to note with no tags. On full update, runs "untagged" again and sees note now has a tag, so it removes itself. On full update, runs again, adds itself back. Infinite loops could also happen based on how two prog tags interact with each other.
      while (this.progTagDepth > 0) {
        console.groupEnd();
        this.progTagDepth--;
      }
      this._logger.error('Recursive depth of 5 exceeded when working out programmatic tags.')
      throw Error('Recursive depth of 5 exceeded when working out programmatic tags on note ID ' + this.id);
    }

    _.each(this.dataService.tags.tags, (tag) => {
      if (tag && tag.prog) {
        // @TODO/prog We could probably identify which tags are causing any infinite loops by keeping track of which tags are going back and forth somehow
        tag.runProgOnNote(this);
      }
    });

    this.progTagDepth--;

    console.groupEnd();
    this._logger.timeEnd('Ran smart tags in');
  }
}
