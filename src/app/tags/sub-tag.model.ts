import {Logger} from '../utils/';

import {Tag} from './';


/** Has all of the information and properties of the base Tag instance, but `docs` is redefined to just the note IDs of the subtag as grabbed from `subTagDocs`, and `name` is appended with subTag name. */
export class SubTag extends Tag {
  subTagName: string;
  baseTag: Tag;

  constructor(subTagName: string, baseTag: Tag) {
    super(baseTag, baseTag.dataService);

    this.subTagName = subTagName;
    this.baseTag = baseTag;

    this.name += ': ' + subTagName;
    this.docs = baseTag.subTagDocs[subTagName];

    this._logger = new Logger('SubTag ' + this.id + ':' + subTagName);
  }
}
