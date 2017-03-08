import {Logger} from '../utils/logger';

import {DataService} from '../data.service';

import * as _ from 'lodash';

export class Setting {
  id: string;
  name: string;
  description: string;

  /** Type of value the setting supports. Only 'boolean' and 'string' supported so far in UI. */
  type: string;

  /** Where this setting belongs. */
  section: 'settings' | 'shortcuts' | 'account';

  /** Settings are displayed grouped according to subsections, each with a heading. Settings with no subsections are shown first. */
  subSection?: string;

  /** For power users - don't display by default. */
  overkill = false;
  /** Never display. */
  internal = false;

  default: any;
  value: any; // current value used in app

  /** Custom function called to make setting take effect - e.g. called when setting first initialized and every time it's updated. Called with setting model as `this`. */
  enact: Function;

  /** The <body> element will be classed with `'setting--' + setting.id` when `setting.value === true`. */
  bodyClass: boolean;

  /** Raw HTML spit out after setting label. @TODO/settings There is a much better way to do this. Setting should be a componenton its own with its own instantiations and views and actions. */
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

    this._enact();

    this._logger = new Logger('Setting ' + this.id);
  }

  /** Call whenever setting has been updated and we should make it take effect and save it to data store. Calling it without explicit `newVal` will use the current `value`, which works great if it `value` is being used as the model for some input. */
  updated(newVal = this.value): void {
    if (newVal === this.savedValue) {
      return;
    }

    this._logger.log('Updating to', newVal);
    this.savedValue = this.value = newVal;

    this._enact();

    this.dataService.digest$.emit(this);
  }

  /** Function called to make setting take effect - e.g. called when setting first initialized and every time it's updated. */
  _enact(): void {
    if (this.bodyClass) {
      if (this.value === true) {
        window.document.body.classList.add('setting--' + this.id);
      }
      else {
        window.document.body.classList.remove('setting--' + this.id);
      }
    }

    // Call any custom `enact` function we have
    this.enact && this.enact();
  }

  /** Outputs rendition of setting that we want to save to the data store. */
  forDataStore(): any {
    return this.value;
  }
}
