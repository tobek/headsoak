import {Component, EventEmitter/*, ElementRef*/, Input, Output} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';
// import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {Tag, TagComponent, ProgTagControlComponent} from './';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts
import {ToasterService} from '../toaster.service';
import {Logger} from '../utils/';

@Component({
  selector: 'tag-details',
  pipes: [],
  directives: [
    TagComponent,
    ProgTagControlComponent,
  ],
  template: require('./tag-details.component.html')
})
export class TagDetailsComponent {
  DEFAULT_PANE = 'explore'
  activePane = this.DEFAULT_PANE;

  /** ID of tag that has been explored, if any. */
  exploreComputed: string;
  exploreStats: {
    topCooccurrences: [ { tag: Tag, numNotes: number }],
    bottomCooccurrences: [ { tag: Tag, numNotes: number }]
  };

  @Input() tag: Tag;
  @Output() deleted = new EventEmitter<Tag>();

  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    // private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    private toaster: ToasterService,
    private tagsService: TagsService,
    private router: Router,
  ) {
    // this.el = elRef.nativeElement;
  }

  _deleted(): void {
    if (this.tag.delete(true)) {
      this.deleted.emit(this.tag);
      this.router.navigateByUrl('/tags');

      // @TODO/ece Another place where hashtag should maybe be used?
      // @TODO/ece Warning? Error?
      // @TODO Should have an undo button here
      this.toaster.warning('Deleted tag "' + this.tag.name + '"');
    }
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
    // @HACK Should be able to subscribe to just param events via ActivatedRoute to get tag ID from `/tags/:tagId...` paths the params observer isn't firing - might be because of the EmptyComponents hack or maybe a bug that's fixed in later version, but anyway here we go:
    const pathParts = event.url.substring(1).split('/');

    // Ensure we're on a /tags/tag/:tagId... route:
    if (pathParts[0] !== 'tags' || pathParts[1] !== 'tag') {
      return;
    }

    if (pathParts[4]) {
      this.activePane = pathParts[4];
    }
    else {
      this.activePane = this.DEFAULT_PANE;
    }

    if (this.activePane === 'explore') {
      // Wait a tick while router change hits Tag Browser and changes the tag that gets @Input into us
      setTimeout(this.computeExplore.bind(this), 0);
    }
  }

  exploreStatsReset(): void {
    this.exploreStats = {
      topCooccurrences: <[{ tag: Tag, numNotes: number }]>[],
      bottomCooccurrences: <[{ tag: Tag, numNotes: number }]>[],
    };
  }

  computeExplore(): void {
    if (this.exploreComputed === this.tag.id) {
      return;
    }

    this._logger.time('Calculating explore stats');

    this.exploreStatsReset();

    const cooccurrences: { [key: string]: number } = {}; // tagId => # of cooccurrences
    this.tag.docs.forEach((noteId) => {
      const note = this.tagsService.dataService.notes.notes[noteId];

      if (! note) {
        return;
      }

      note.tags.forEach((tagId) => {
        if (tagId == this.tag.id) { // intentional == (we have some integer IDs floating around in data store)
          return;
        }

        if (! cooccurrences[tagId]) {
          cooccurrences[tagId] = 1;
        }
        else {
          cooccurrences[tagId]++;
        }
      });
    });

    if (_.size(cooccurrences)) {
      const sortedCooccurrences = _.keys(cooccurrences).sort(function(a, b) {
        return cooccurrences[a] - cooccurrences[b];
      });
      // We now have array of tagIds sorted from least-cooccurring to most-

      while(_.size(sortedCooccurrences) && this.exploreStats.topCooccurrences.length < 5) {
        const tag = this.tagsService.tags[sortedCooccurrences.pop()];

        if (! tag) {
          continue;
        }

        this.exploreStats.topCooccurrences.push({
          tag: tag,
          numNotes: cooccurrences[tag.id]
        });
      }

      while(_.size(sortedCooccurrences) && this.exploreStats.bottomCooccurrences.length < 5) {
        const tag = this.tagsService.tags[sortedCooccurrences.shift()];

        if (! tag) {
          continue;
        }

        this.exploreStats.bottomCooccurrences.push({
          tag: tag,
          numNotes: cooccurrences[tag.id]
        });
      }
    }

    this.exploreComputed = this.tag.id;

    this._logger.timeEnd('Calculating explore stats');
  }

}
