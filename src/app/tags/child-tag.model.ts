import {DataService} from '../data.service';

import {Logger} from '../utils/';

import {Tag} from './';

import * as _ from 'lodash';

/** Has all of the information and properties of the base Tag instance, but `docs` is redefined to just the note IDs of the child tag as grabbed from `childTagDocs`, and `name` is appended with childTag name. */
export class ChildTag extends Tag {
  childTagName: string;
  parentTagId: string;

  static DATA_PROPS = _.concat(Tag.DATA_PROPS, [
    'childTagName',
    'parentTagId',
  ]);

  constructor(tagData: any, public dataService: DataService) {
    super(tagData, dataService);

    if (! tagData.parentTagId || ! tagData.childTagName) {
      throw new Error('Must supply child tag with parent tag ID and child tag name');
    }

    if (! this.name) {
      this.name = this.parentTag.name + ': ' + this.childTagName;
    }

    this._logger = new Logger('ChildTag ' + this.id);
  }
}
