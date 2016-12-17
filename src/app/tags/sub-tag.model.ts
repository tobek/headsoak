import {Logger} from '../utils/';

import {Tag, TagsService} from './';


/** Has all of the information and properties of the base Tag instance, but `docs` is redefined to just the note IDs of the subtag as grabbed from `subTagDocs`, and `name` is appended with subTag name. */
export class SubTag extends Tag {
  subTagName: string;
  baseTag: Tag;

  constructor(subTagName: string, baseTag: Tag) {
    super(baseTag.forDataStore(), baseTag.dataService);

    this.subTagName = subTagName;
    this.baseTag = baseTag;

    this.name += ': ' + subTagName;
    this.id += ':' + subTagName;
    this.docs = baseTag.subTagDocs[subTagName];

    this._logger = new Logger('SubTag ' + this.id + ':' + subTagName);
  }

  get baseTagId(): string {
    return this.baseTag.id;
  }

  /** Given an id that may be a subtag or not, returns the Tag or SubTag instance. */
  static getTagOrSubTag(id: string, tagsService: TagsService): Tag | SubTag {
    const idParts = id.split(':');

    const tag = tagsService.tags[idParts[0]];

    if (idParts.length === 2) {
      return new SubTag(idParts[1], tag);
    }
    else if (idParts.length === 1) {
      return tag;
    }
    else {
      throw new Error('Can\'t get tag or subtag: unexpected id format: ' + id);
    }
  }
}
