import {Pipe, PipeTransform} from 'angular2/core';

@Pipe({ name: 'arrayLimit' })
export class ArrayLimitPipe implements PipeTransform {
  transform(arr: Array<any>, [limit]): Array<any> {
    return _.take(arr, limit);
  }
}
