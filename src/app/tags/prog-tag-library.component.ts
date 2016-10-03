import {Component} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagComponent} from './tag.component';
import {ProgTagLibraryService} from './prog-tag-library.service';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

@Component({
  selector: 'prog-tag-library',
  pipes: [],
  directives: [
    TagComponent
  ],
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

    if (! this.tagsService.tags[tag.id]) {
      this.tagsService.addTag(tag);
    }
    else {
      // Doesn't actually destroy instance, but it removes from all notes, from tag list, and from user data store:
      tag.delete(true);
    }
  }
}
