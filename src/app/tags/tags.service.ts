import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {Logger, utils} from '../utils/';
import {DataService} from '../';

import {Tag} from './tag.model'; // For some reason this breaks with `TypeError: Cannot read property 'getOptional' of undefined` if I do `from './'`, which I think should work
import {ProgTagApiService} from './prog-tag-api.service';

@Injectable()
export class TagsService {
  tags: { [key: string]: Tag } = {}; // id -> Tag instance
  initialized$ = new ReplaySubject<void>(1);

  /**
   * id format: `[desiredOrder] + '-' + field + '-' + rev`
   */
  sortOpts = [
    { id: '0-docs.length-true', field: 'docs.length', rev: true, name: 'Most used'},
    { id: '1-docs.length-false', field: 'docs.length', rev: false, name: 'Least used'},
    // @TODO should this be called used, modified, or something else? should name change depending on nutChangesChangeTagModifiedTimestamp setting? should we have both options?
    { id: '2-modified-true', field: 'modified', rev: true, name: 'Recently used'},
    { id: '3-modified-false', field: 'modified', rev: false, name: 'Oldest used'},
    { id: '4-created-true', field: 'created', rev: true, name: 'Recently created'},
    { id: '5-created-false', field: 'created', rev: false, name: 'Oldest created'},
    { id: '6-name-false', field: 'name', rev: false, name: 'Alphabetically'},
    { id: '7-name-true', field: 'name', rev: true, name: 'Alpha (reversed)'},
  ];

  dataService: DataService;
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public progTagApi: ProgTagApiService
  ) {}

  init(tagsData: Object, dataService: DataService) {
    this.dataService = dataService;

    if (_.isEmpty(tagsData)) {
      tagsData = {};
    }

    _.each(tagsData, _.partialRight(this.createTag, true).bind(this));

    this.progTagApi.init(this.dataService);

    this.initialized$.next(null);

    this._logger.log('Got', _.size(this.tags), 'tags');
  }

  createTag(tagData: any = {}, isInit = false): Tag {
    if (tagData.id) {
      if (this.tags[tagData.id]) {
        throw new Error('Cannot create a new tag with id "' + tagData.id + '" - that ID is already taken!');
      }
    }
    else {
      tagData.id = utils.getUnusedKeyFromObj(this.tags);
    }

    // @TODO/rewrite/sharing Temporarily hide shared tags until they're set up again
    if (tagData.sharedBy) {
      return null;
    }

    const newTag = new Tag(tagData, this.dataService);
    this.tags[newTag.id] = newTag;

    // No need to sync to data store if we're initializing notes from data store. Additionally, if this is a new tag with no name, no need to save yet - we'll save when it gets named.
    if (! isInit && tagData.name) {
      newTag.updated();
    }

    // @TODO/rewrite what else?

    return newTag;
  }

  /** Adds an already existing Tag instance to user's tags. */
  addTag(tag: Tag): void {
    if (this.tags[tag.id]) {
      throw new Error('Cannot add tag with id "' + tag.id + '" - that ID is already taken!');
    }

    this.tags[tag.id] = tag;
    tag.created = Date.now();

    if (tag.prog) {
      tag.runProgOnAllNotes();
    }
    
    tag.updated(); // sync to data store
  }

  /** Doesn't actually "delete" tag, e.g. remove it from notes. This function simply removes it from list of tags and from tags in data store. */
  removeTag(tag: Tag): void {
    this.dataService.removeData('tag', tag.id);
    delete this.tags[tag.id];
  }

  getTagByName(name: string): Tag {
    // @TODO Doesn't handle duplicate tag names. Dupe tag names aren't handled at all actually.
    return _.find(this.tags, { name: name });
  }

  sortTags(sortOpt?, tagsToSort?): Tag[] {
    if (! tagsToSort) tagsToSort = this.tags;
    if (! tagsToSort || tagsToSort.length === 0) return [];

    if (! sortOpt) {
      // Just get the "first" sort option
      sortOpt = this.sortOpts[0];
    }

    this._logger.time('Sorting tags');
    this._logger.log('Sorting tags by', sortOpt);

    let sortedTags;

    if (sortOpt.field.indexOf('.') !== -1 ) { // e.g. field might be `docs.length`
      var fields = sortOpt.field.split('.');

      sortedTags = _.sortBy(tagsToSort, function(tag: Tag) {
        return tag[fields[0]] ? tag[fields[0]][fields[1]] : 0;
      });
    }
    else { // e.g. `created`
      sortedTags = _.sortBy(tagsToSort, sortOpt.field);
    }
    // @NOTE: Here is a more generic way to deal with this indexing of sub-objects by dot-notation string: http://stackoverflow.com/a/6394168. _.get might do it too.

    if (sortOpt.rev) sortedTags.reverse();

    this._logger.timeEnd('Sorting tags');

    return sortedTags;
  }

  clear(): void {
    this.tags = {};
  }
}
