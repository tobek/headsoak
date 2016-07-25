import {Component, EventEmitter, Input, Output} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

@Component({
  selector: 'tag',
  pipes: [],
  styles: [ require('./tag.component.css') ],
  template: require('./tag.component.html')
})
export class TagComponent {
  @Input() tagId: string;
  tag: Tag;

  @Input() removable: boolean;
  @Output() removed = new EventEmitter<Tag>();

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {}

  ngOnInit() {
    this.tag = this.tagsService.tags[this.tagId];
  }

  remove() {
    this.removed.emit(this.tag);
  }

}
