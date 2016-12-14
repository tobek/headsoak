import {Pipe, PipeTransform} from '@angular/core';

import * as _ from 'lodash';

@Pipe({ name: 'arrayLimit' })
export class ArrayLimitPipe implements PipeTransform {
  transform(arr: Array<any>, limit?: number): Array<any> {
    return limit ? _.take(arr, limit) : arr;
  }
}
