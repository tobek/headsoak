import {Pipe, PipeTransform} from '@angular/core';

import {Logger} from '../utils/';

import {Tag} from '../tags/';

import * as _ from 'lodash';

@Pipe({ name: 'internalTagsFilter' })
export class InternalTagsFilterPipe implements PipeTransform {
  private _logger: Logger = new Logger(this.constructor.name);

  transform(arr: Array<string | Tag>): Array<string | Tag> {
    if (! _.size(arr)) {
      return [];
    }

    if (typeof arr[0] === 'string') {
      // these are tag IDs
      return _.without(arr, ...Tag.INTERNAL_TAG_IDS);
    }
    else {
      // these are Tag instances
      // return _.filter(arr, (tag: Tag) => ! tag.internal);
      return _.filter(arr, (tag: Tag) => {
        if (! tag) {
          this._logger.warn('Falsey tag passed in to internal tags filter!', arr, tag);
          return false;
        }
        return ! tag.internal;
      });
    }
  }
}
