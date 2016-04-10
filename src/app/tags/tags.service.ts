import {Injectable} from 'angular2/core';

import {Logger, utils} from '../utils/';

@Injectable()
export class TagsService {
  // notes: Array<Tag>;

  private _logger: Logger = new Logger(this.constructor.name);

  init(tags) {
    // firebase stores as objects but if data is "array-like" then we get back arrays. we need objects because we may have non-numeric keys, and because we migrated to string keys. TODO may not be necessary in the futre, see also idsMigrated which was done at the same time
    var tagsObj: Object = utils.objFromArray(tags) || {};

    // firebase doesn't store empty arrays, so we get undefined for unused tags. which screws up sorting by tag usage
    _.each(tagsObj, function(tag) {
      if (! tag.docs) tag.docs = [];
    });

    this._logger.log('got tags', tagsObj);
  }
}
