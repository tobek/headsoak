import {Logger} from '../utils/logger';

import {DataService} from '../data.service';

import * as _ from 'lodash';

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

  /** Function called to make setting take effect - e.g. called when setting first initialized and every time it's updated. */
  enact = () => {};

  /** Raw HTML spit out after setting label. @TODO/settings There is a much better way to do this. Setting should be a componenton its own with its own instantiations and views and actions. **/
  postSettingHtml = '';

  /** This gets attached to the SettingComponent element and will catch any clicks as they bubble up. */
  clickHandler: Function;

  private savedValue: any; // last saved value, used to see if it has changed when we get "updated"

  private _logger: Logger;

  constructor(settingData: any, public dataService: DataService) {
    if (settingData.value === undefined) {
      settingData.value = settingData.default;
    }

    _.extend(this, settingData);

    this.savedValue = this.value;

    this.enact();

    this._logger = new Logger('Setting ' + this.id);
  }

  /** Call whenever setting has been updated and we should make it take effect and save it to data store. Calling it without explicit `newVal` will use the current `value`, which works great if it `value` is being used as the model for some input. */
  updated(newVal = this.value): void {
    if (newVal === this.savedValue) {
      return;
    }

    this._logger.log('Updating to', newVal);
    this.savedValue = this.value = newVal;

    this.enact();

    this.dataService.digest$.emit(this);
  }

  /** Outputs rendition of setting that we want to save to the data store. */
  forDataStore(): any {
    return this.value;
  }
}
