import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

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
  sectionName: string;
  section: string; // currently 'settings' or 'shortcuts'

  private displayedSettings: Setting[] = [];

  private _logger = new Logger(this.constructor.name);

  constructor(
    private route: ActivatedRoute,
    private settings: SettingsService,
    private dataService: DataService
  ) {
  }

  ngOnInit() {
    this.sectionName = this.route.snapshot.data['name'];
    this.section = this.route.snapshot.data['section'];

    if (! _.isEmpty(this.settings.data)) {
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
      return setting.section === this.section && ! setting.overkill && ! setting.internal;
    });
  }

  settingUpdated(setting: Setting, newVal: any): void {
    setting.value = this.settings[setting.id] = newVal;

    setting.updated();
    this.dataService.sync(); // so user doesn't sit there waiting for setting to save @TODO/rewrite/settings If this happens fast you barely see it - animation should make it last and fade
  }

  revert() {
    _.each(this.displayedSettings, (setting: Setting) => {
      if (setting.value !== setting.default) {
        setting.value = this.settings[setting.id] = setting.default;
        setting.updated();
      }
    });

    this.dataService.sync();
  }

}
