import {Logger} from '../utils/';

import {Tag, TagsService} from './';


/** Has all of the information and properties of the base Tag instance, but `docs` is redefined to just the note IDs of the child tag as grabbed from `childTagDocs`, and `name` is appended with childTag name. */
export class ChildTag extends Tag {
  childTagName: string;
  parentTag: Tag;

  constructor(childTagName: string, parentTag: Tag) {
    super(parentTag.forDataStore(), parentTag.dataService);

    this.childTagName = childTagName;
    this.parentTag = parentTag;

    this.name += ': ' + childTagName;
    this.id += ':' + childTagName;
    this.docs = parentTag.childTagDocs[childTagName];
    this.childTagDocs = null;

    this._logger = new Logger('ChildTag ' + this.id + ':' + childTagName);
  }

  get parentTagId(): string {
    return this.parentTag.id;
  }

  /** Given an id that may be a child tag or not, returns the Tag or ChildTag instance. */
  static getTagOrChildTag(id: string, tagsService: TagsService): Tag | ChildTag {
    const idParts = id.split(':');

    const tag = tagsService.tags[idParts[0]];

    if (idParts.length === 2) {
      return new ChildTag(idParts[1], tag);
    }
    else if (idParts.length === 1) {
      return tag;
    }
    else {
      throw new Error('Can\'t get tag or child tag: unexpected id format: ' + id);
    }
  }
}
