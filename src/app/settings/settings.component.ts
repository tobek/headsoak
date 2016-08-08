import {Component} from '@angular/core';

import {Logger} from '../utils/';

import {DataService} from '../data.service';
import {SettingsService} from './settings.service';
import {Setting} from './setting.model';

@Component({
  selector: 'settings',
  styles: [
    // require('./settings.component.css')
  ],
  template: require('./settings.component.html')
})
export class SettingsComponent {
  private displayedSettings: Setting[] = [];

  private _logger = new Logger(this.constructor.name);

  constructor(
    private settings: SettingsService,
    private dataService: DataService
  ) {

  }

  ngOnInit() {
    if (! _.isEmpty(this.settings.settings)) {
      this.init();
    }
    else {
      let subscription = this.settings.initialized$.subscribe(() => {
        this.init();
        subscription.unsubscribe();
      });
    }
  }

  init(): void {
    this._logger.log('`Settings` component initialized');

    this.displayedSettings = _.filter(this.settings.data, (setting) => {
      return setting.section === 'settings' && ! setting.overkill;
    });
  }

  settingUpdated(setting: Setting, newVal: any): void {
    setting.value = this.settings[setting.id] = newVal;

    setting.updated();
    this.dataService.sync(); // so user doesn't sit there waiting for setting to save @TODO/rewrite/settings If this happens fast you barely see it - animation should make it last and fade
  }

  revert() {

  }

}
