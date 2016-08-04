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
    if (! tagData.id || ! tagData.name) {
      throw new Error('Must supply tag with id and name');
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

  addNote(noteId: string) {
    this._logger.log('Adding note id', noteId);
    this.docs.push(noteId);
    this.updated();
  }
  removeNote(noteId: string) {
    this._logger.log('Removing note id', noteId);
    this.docs = _.without(this.docs, noteId);
    this.updated();
  }
}
