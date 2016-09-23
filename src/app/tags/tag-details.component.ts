import {Component, EventEmitter/*, ElementRef*/, Input, Output} from '@angular/core';
import {Router} from '@angular/router';
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
  activePane = 'explore';

  @Input() tag: Tag;
  @Output() deleted = new EventEmitter<Tag>();

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    // private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    // private tagsService: TagsService,
    private router: Router,
  ) {
    // this.el = elRef.nativeElement;
  }

  _deleted(): void {
    if (this.tag.delete(true)) {
      this.deleted.emit(this.tag);
      this.router.navigateByUrl('/tags');
    }

    // @TODO/notifications Toaster notif (allowing undo, so change copy) should be here.
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

}
