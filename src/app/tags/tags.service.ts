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

    _.each(tagsData, this.createTag.bind(this));

    this._logger.log('got', _.size(this.tags), ' tags');
  }

  createTag(tagData: any): Tag {
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

    // @TODO/rewrite what else?

    return newTag;
  }

  getTagByName(name: string): Tag {
    return _.find(this.tags, { name: name });
  }
}
