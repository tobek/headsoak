import {Logger} from '../utils/logger';

import {DataService} from '../';

export class Setting {
  id: string;
  name: string;
  description: string;

  /** Type of value the setting supports. Only 'boolean' and 'string' supported so far in UI. */
  type: string;

  /** Where thissetting belongs to. 'settings' | 'shortcuts' for now. */
  section: string;

  /** For power users - don't display by default. */
  overkill = false;
  /** Never display. */
  internal = false;

  default: any;
  value: any; // current value used in app

  private _logger: Logger;

  constructor(settingData: any, public dataService: DataService) {
    if (settingData.value === undefined) {
      settingData.value = settingData.default;
    }

    _.extend(this, settingData);

    this._logger = new Logger('Note ' + this.id);
  }

  updated(newVal: any): void {
    this._logger.log('Updating to', newVal);

    this.value = newVal;

    this.dataService.digest$.emit(this);
  }

  /** Outputs rendition of setting that we want to save to the data store. */
  forDataStore(): any {
    return this.value;
  }
}
