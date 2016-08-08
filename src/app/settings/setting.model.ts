import {EventEmitter} from '@angular/core';

import {Logger} from '../utils/logger';

import {DataService} from '../';

export class Setting {
  id: string;
  name: string;
  description: string;
  type: string; // only 'boolean' supported so far in UI, but 'string' supported for internal ones
  section: string; // 'settings' | null
  overkill = false;

  default: any;
  value: any;

  private _logger: Logger;

  constructor(settingData: any, private dataService: DataService) {
    if (! settingData.value) {
      settingData.value = settingData.default;
    }

    _.extend(this, settingData);

    this._logger = new Logger('Note ' + this.id);
  }

  updated(): void {
    this._logger.log('Updated');

    this.dataService.digest$.emit(this);
  }

  /** Outputs rendition of setting that we want to save to the data store. */
  forDataStore(): any {
    return this.value;
  }
}
