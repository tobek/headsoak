import {Component, EventEmitter/*, ElementRef*/, Input, Output} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
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
  DEFAULT_PANE = 'explore'
  activePane = this.DEFAULT_PANE;

  @Input() tag: Tag;
  @Output() deleted = new EventEmitter<Tag>();

  private routerSub: Subscription;

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
    this.routerSub = this.router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this));
    // Above won't trigger with current router state, so let's do so manually:
    this.routeUpdated(this.router);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  routeUpdated(event: NavigationEnd | Router) {
    // @HACK Should be able to subscribe to just param events via ActivatedRoute to get tag ID from /tags/:tagId/:tagName/:section paths but it's not working, maybe because I can't get child routes to work, but anyway here we go:
    const pathParts = event.url.substring(1).split('/');
    if (pathParts[0] === 'tags' && pathParts[3]) {
      this.activePane = pathParts[3];
    }
    else {
      this.activePane = this.DEFAULT_PANE;
    }
  }

}
