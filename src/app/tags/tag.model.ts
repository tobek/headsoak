import {DataService} from '../';

import {Logger} from '../utils/logger';

export class Tag {
  id: string;
  name: string;
  created: number;
  modified: number;

  // Optional:
  docs: string[]; // array of note IDs
  prog: boolean; // whether it's a programmatic tag @TODO/rewrite can't we just use the progFuncString?
  progFuncString: string; // string representing programmatic tag function to be eval'd
  readOnly: boolean; // @TODO/old handle other permissions @TODO/rewrite this still needed here?

  share: any; // map of recipient (shared-with) user ID to their permissions
  sharedBy: string; // ID of user that shared this tag
  shareTooltip: string; // text to identify sharing status to user (e.g. "you are sharing this with ___" or "___ is sharing this with you")

  /** Properties that we save to data store */
  private DATA_PROPS = [
    'id',
    'name',
    'created',
    'modified',
    'docs',
    'prog',
    'progFuncString',
    'readOnly',
    'share',
    'sharedBy',
  ];

  private _logger: Logger;

  // @TODO how do we handle duplicate names?
  constructor(tagData: any, private dataService: DataService) {
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

    // @TODO/rewrite/tags
    // if (updateNut && tag.docs) {
    //   tag.docs.forEach(function(docId) {
    //     $s.n.nutUpdated(docId, $s.c.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
    //   });
    // }

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
      this.dataService.notes.notes[noteId].removeTag(this);
    });

    // @TODO/rewrite/sharing
    // if (this.share && ! this.sharedBy) {
    //   // Shared tag that is shared by the current user
    //   $s.t.unshareTagWithAll(tag);
    // }

    this.dataService.tags.removeTag(this);

    this._logger.log('Deleted');

    return true;
  }

  addNoteId(noteId: string): void {
    this._logger.log('Adding note id', noteId);
    this.docs = _.union(this.docs, [noteId]);
    this.updated();
  }
  removeNoteId(noteId: string): void {
    this._logger.log('Removing note id', noteId);
    this.docs = _.without(this.docs, noteId);
    this.updated();
  }
}
