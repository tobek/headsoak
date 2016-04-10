import {Injectable} from 'angular2/core';

import {Logger, utils} from '../utils/';

@Injectable()
export class NotesService {
  // notes: Array<Note>;

  private _logger: Logger = new Logger(this.constructor.name);

  init(notes) {
    // firebase stores as objects but if data is "array-like" then we get back arrays. we need objects because we may have non-numeric keys, and because we migrated to string keys. TODO may not be necessary in the futre, see also idsMigrated which was done at the same time
    var notesObj: Object = utils.objFromArray(notes) || {};

    _.each(notesObj, function(nut) {
      // firebase doesn't store empty arrays, so we get undefined for notes with no tags, which can screw things up
      if (! nut.tags) nut.tags = [];

      // @TODO/rewrite
      // // if user was disconnected while editing a note, we won't have done a full update (which we only do on blur), so do that now
      // if (nut.fullUpdateRequired) {
      //   console.log('nut ' + nut.id + ' was saved but requires a full update');
      //   $s.n.nutDoFullUpdate(nut);
      // }
    });

    // @TODO/rewrite
    // console.time("initializing lunr index");
    // _.each($s.n.nuts, $s.n.updateNutInIndex);
    // console.timeEnd("initializing lunr index");

    this._logger.log('got notes', notesObj);
  }
}
