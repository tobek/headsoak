import {Injectable} from '@angular/core';

import {Logger, utils} from '../utils/';
import {DataService} from '../';

import {Tag} from './tag.model'; // For some reason this breaks with `TypeError: Cannot read property 'getOptional' of undefined` if I do `from './'`, which I think should work

@Injectable()
export class TagsService {
  tags: { [key: string]: Tag }; // id -> Tag instance

  private _logger: Logger = new Logger(this.constructor.name);
  private dataService: DataService;

  init(tags: Object, dataService: DataService) {
    this.dataService = dataService;

    // firebase stores as objects but if data is "array-like" then we get back arrays. we need objects because we may have non-numeric keys, and because we migrated to string keys. TODO may not be necessary in the future, see also idsMigrated which was done at the same time
    var tagsObj: Object = utils.objFromArray(tags) || {};

    this.tags = <{ [key: string]: Tag }>(_.mapValues(
      tagsObj, (tag) => new Tag(tag)
     ));

    // this._logger.log('got tags', this.tags);
    this._logger.log('got', _.size(this.tags), ' tags');
  }

  // @TODO/rewrite/tags unused so far
  createTag(tagData: any) {
    var newId = utils.getUnusedKeyFromObj(this.tags);

    this.tags[newId] = new Tag(tagData, this.dataService);

    // this.createTagName = ""; // clear input
    // this.creatingTag = false; // hide input
    // return newId;
  }

  getTagByName(name: string): Tag {
    return _.find(this.tags, { name: name });
  }
}
