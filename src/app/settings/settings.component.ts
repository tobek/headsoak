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

  private settingUpdatedDebounced = _.debounce(this.settingUpdated.bind(this), 250);
  private syncDebounced = _.debounce(this.dataService.sync.bind(this.dataService), 1000);

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

  settingUpdated(setting: Setting | Shortcut, newVal: any): void {
    if (newVal === this.settings[setting.id]) {
      return;
    }

    setting.value = this.settings[setting.id] = newVal;

    setting.updated();
    this.syncDebounced(); // Digest sync is 5s which is a bit long if user is sitting there waiting for setting to save
  }

  revert() {
    _.each(this.displayedSettings, (setting: Setting | Shortcut) => {
      if (setting.value !== setting.default) {
        setting.value = this.settings[setting.id] = setting.default;
        setting.updated();
      }
    });

    this.dataService.sync();
  }

}
