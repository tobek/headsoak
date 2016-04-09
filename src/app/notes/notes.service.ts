import {Injectable} from 'angular2/core';

import {Logger} from '../utils/logger';

@Injectable()
export class NotesService {
  // notes: Array<Note>;

  private _logger: Logger = new Logger(this.constructor.name);

  init(notes) {
    this._logger.log('got notes', notes);
  }
}
