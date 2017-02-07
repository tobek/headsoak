import {Injectable} from '@angular/core';
import {Subject, ReplaySubject} from 'rxjs';

import {Logger, utils} from '../utils/';
import {DataService} from '../data.service';

import {Tag} from './tag.model'; // For some reason this breaks with `TypeError: Cannot read property 'getOptional' of undefined` if I do `from './'`, which I think should work
import {ProgTagApiService} from './prog-tag-api.service';
import {ProgTagLibraryService} from './prog-tag-library.service';

import * as _ from 'lodash';

@Injectable()
export class TagsService {
  tags: { [tagId: string]: Tag } = {}; // id -> Tag instance
  initialized$ = new ReplaySubject<void>(1);

  /** Updates whenever a tag is added to users tags (not added to a given note). */
  tagCreated$ = new Subject<Tag>();
  /** Updates whenever a tag is removed from users tags (not removed from a given note). */
  tagDeleted$ = new Subject<Tag>();

  // Handy references to just the internal tags
  internalTags: Tag[] = [];

  /**
   * id format: `[desiredOrder] + '-' + field + '-' + rev`
   */
  sortOpts = [
    { id: '0-docs.length-true', field: 'docs.length', rev: true, text: 'Most used'},
    { id: '1-docs.length-false', field: 'docs.length', rev: false, text: 'Least used'},
    // @TODO should this be called used, modified, or something else? should name change depending on nutChangesChangeTagModifiedTimestamp setting? should we have both options?
    { id: '2-modified-true', field: 'modified', rev: true, text: 'Recently used'},
    { id: '3-modified-false', field: 'modified', rev: false, text: 'Oldest used'},
    { id: '4-created-true', field: 'created', rev: true, text: 'Recently created'},
    { id: '5-created-false', field: 'created', rev: false, text: 'Oldest created'},
    { id: '6-name-false', field: 'name', rev: false, text: 'Alphabetically'},
    { id: '7-name-true', field: 'name', rev: true, text: 'Alpha (reversed)'},
  ];

  dataService: DataService;
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public progTagLibraryService: ProgTagLibraryService,
    public progTagApi: ProgTagApiService
  ) {}

  init(tagsData: Object, dataService: DataService) {
    this.dataService = dataService;

    if (_.isEmpty(tagsData)) {
      tagsData = {};
    }

    _(tagsData)
      .filter((tag) => tag)
      .each(this.createTag.bind(this));

    this.setUpInternalTags();

    this.progTagApi.init(this.dataService);
    this.progTagLibraryService.init(this);

    this.initialized$.next(null);

    this._logger.log('Got', _.size(this.tags), 'tags');
  }

  setUpInternalTags() {
    _.each(Tag.INTERNAL_TAG_DATA, (tagData) => {
      if (this.tags[tagData.id]) {
        // User already has this tag set up
        this.internalTags.push(this.tags[tagData.id]);
        return;
      }

      // Otherwise, either this is a new user (@TODO/now check they call get called) or there's a new internal tag - either way, create it and explicitly add it to data store.
      this._logger.info('Initializing internal tag "' + tagData.name + '"');
      this.internalTags.push(this.createTag(tagData, true));
    });
  }

  createTag(tagData: any = {}, addToDataStore = false): Tag {
    if (tagData.id) {
      if (this.tags[tagData.id]) {
        this._logger.error('Cannot create a new tag with id "' + tagData.id + '" - that ID is already taken!\nExisting tag:', this.tags[tagData.id], '\nNew tag:', tagData);
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

    // No need to sync to data store if we're initializing tags from data store.
    if (addToDataStore === true) {
      newTag.updated();
      this.tagCreated$.next(newTag);
    }

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
    this.tagCreated$.next(tag);
  }

  /** Doesn't do all the work required to delete a tag (Tag.delete actually removes it from notes, etc.). This function simply removes it from list of user's tags locally and in data store. */
  removeTag(tag: Tag): void {
    delete this.tags[tag.id];
    this.dataService.removeData('tag', tag.id);
    this.tagDeleted$.next(tag);
  }

  getTagByName(name: string): Tag {
    // @TODO Doesn't handle duplicate tag names. Dupe tag names aren't handled at all actually.
    return _.find(this.tags, { name: name });
  }

  sortTags(sortOpt?, tagsToSort?: Tag[] | {[k: string]: Tag}): Tag[] {
    if (! tagsToSort) tagsToSort = this.tags;
    if (_.isEmpty(tagsToSort)) return [];

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
