import { Component } from '@angular/core';

import { DataService } from '../data.service';
import { SettingsService } from './settings.service';
import { Setting } from './setting.model';

@Component({
  selector: 'settings',
  styles: [
    // require('./settings.component.css')
  ],
  template: require('./settings.component.html')
})
export class SettingsComponent {
  constructor(
    private settings: SettingsService,
    private dataService: DataService
  ) {

  }

  ngOnInit() {
    console.log('`Settings` component initialized');
  }

  settingUpdated(setting: Setting, newVal: any): void {
    setting.value = this.settings[setting.id] = newVal;

    setting.updated();
    this.dataService.sync(); // so user doesn't sit there waiting for setting to save @TODO/rewrite/settings If this happens fast you barely see it - animation should make it last and fade
  }

  revert() {

  }

}
