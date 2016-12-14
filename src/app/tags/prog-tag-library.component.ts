import {Component} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {ProgTagLibraryService} from './prog-tag-library.service';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'prog-tag-library',
  template: require('./prog-tag-library.component.html')
})
export class ProgTagLibraryComponent {
  checked = false;
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService,
    private progTagLibraryService: ProgTagLibraryService,
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
  }

  toggleTag(tag: Tag, event) {
    event.preventDefault();

    this.progTagLibraryService.toggleTag(tag);
  }
}
