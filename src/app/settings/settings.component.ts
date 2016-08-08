import { Component } from '@angular/core';

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
  constructor(private settings: SettingsService) {

  }

  ngOnInit() {
    console.log('`Settings` component initialized');
  }

  settingUpdated(setting: Setting, newVal: any): void {
    setting.value = this.settings[setting.id] = newVal;

    setting.updated();
  }

  revert() {

  }

}
