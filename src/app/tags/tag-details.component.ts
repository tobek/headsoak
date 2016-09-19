import {Component, EventEmitter, ElementRef, Input, Output} from '@angular/core';
// import {Subject, Subscription} from 'rxjs';
// import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {Tag, TagComponent/*, TagsService*/} from './';
import {Logger} from '../utils/';

@Component({
  selector: 'tag-details',
  pipes: [],
  directives: [
    TagComponent,
  ],
  template: require('./tag-details.component.html')
})
export class TagDetailsComponent {
  activePane = '';

  @Input() tag: Tag;
  @Output() goBack = new EventEmitter<void>();

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    // private tagsService: TagsService,
  ) {
    // this.el = elRef.nativeElement;
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

}
