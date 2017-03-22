import {Component, Input, Output, EventEmitter, ElementRef, Renderer} from '@angular/core';

import {Logger} from '../utils/';

import {DataService} from '../data.service';
import {SettingsService, Setting, Shortcut} from './';

@Component({
  selector: 'setting',
  templateUrl: './setting.component.html'
})
export class SettingComponent {
  @Input() setting: Setting;
  @Input() settings: SettingsService;
  @Output() updated = new EventEmitter<any[]>();

  private removeHandler: Function;
  private _logger = new Logger('SettingComponent');

  constructor(
    public dataService: DataService,
    private elementRef: ElementRef,
    private renderer: Renderer
  ) {
  }

  ngOnInit() {
  }

  ngAfterViewInit() {
    if (this.setting.clickHandler) {
      this.removeHandler = this.renderer.listen(this.elementRef.nativeElement, 'click', (e) => {
        this.setting.clickHandler(e);
      });
    }
  }

  ngOnDestroy() {
    if (this.removeHandler) {
      this.removeHandler();
    }
  }

  settingUpdated(...args): void {
    this.updated.emit(args);
  }

}
