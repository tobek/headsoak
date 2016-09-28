import {Component, Input} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {TagsService} from './tags.service';

import {Logger} from '../utils/';

@Component({
  selector: 'prog-tag-control',
  pipes: [],
  directives: [
  ],
  template: require('./prog-tag-control.component.html')
})
export class ProgTagControlComponent {
  @Input() tag: Tag;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService,
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }
}
