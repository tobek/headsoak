import {Injectable} from 'angular2/core';

import {Logger} from '../utils/logger';

@Injectable()
export class TagsService {
  // notes: Array<Tag>;

  private _logger: Logger = new Logger(this.constructor.name);
  
  init(tags) {
    this._logger.log('got tags', tags);
  }
}
