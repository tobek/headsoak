import {Injectable} from '@angular/core';

import {Logger, utils} from '../utils/';
import {DataService} from '../';

import {Tag} from './tag.model'; // For some reason this breaks with `TypeError: Cannot read property 'getOptional' of undefined` if I do `from './'`, which I think should work

@Injectable()
export class TagsService {
  tags: { [key: string]: Tag } = {}; // id -> Tag instance

  private _logger: Logger = new Logger(this.constructor.name);
  private dataService: DataService;

  init(tagsData: Object, dataService: DataService) {
    this.dataService = dataService;

    _.each(tagsData, _.partialRight(this.createTag, true).bind(this));

    this._logger.log('got', _.size(this.tags), ' tags');
  }

  createTag(tagData: any, isInit = false): Tag {
    if (tagData.id) {
      if (this.tags[tagData.id]) {
        throw new Error('Cannot create a new tag with id "' + tagData.id + '" - already taken!');
      }
    }
    else {
      tagData.id = utils.getUnusedKeyFromObj(this.tags);
    }

    const newTag = new Tag(tagData, this.dataService);
    this.tags[newTag.id] = newTag;

    if (! isInit) {
      newTag.updated();
    }

    // @TODO/rewrite what else?

    return newTag;
  }

  getTagByName(name: string): Tag {
    // @TODO Doesn't handle duplicate tag names. Dupe tag names aren't handled at all actually.
    return _.find(this.tags, { name: name });
  }
}
