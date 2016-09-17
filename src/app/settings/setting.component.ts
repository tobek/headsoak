import {Component, Input, Output, EventEmitter} from '@angular/core';

import {Logger} from '../utils/';

import {DataService} from '../data.service';
import {Setting, Shortcut} from './';

@Component({
  selector: 'setting',
  template: require('./setting.component.html')
})
export class SettingComponent {
  @Input() setting: Setting;
  @Output() updated = new EventEmitter<Array<any>>();

  private _logger = new Logger(this.constructor.name);

  constructor(
    private dataService: DataService
  ) {
  }

  ngOnInit() {
  }

  init(): void {
  }

  settingUpdated(...args): void {
    this.updated.emit(args);
  }

}
