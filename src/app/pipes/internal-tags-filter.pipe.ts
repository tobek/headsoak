import {Pipe, PipeTransform} from '@angular/core';

import {Tag} from '../tags/';

import * as _ from 'lodash';

@Pipe({ name: 'internalTagsFilter' })
export class InternalTagsFilterPipe implements PipeTransform {

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
      return _.filter(arr, (tag: Tag) => ! tag.internal);
    }
  }
}
