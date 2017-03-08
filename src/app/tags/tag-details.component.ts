import {Component, Inject, forwardRef, EventEmitter, ElementRef, ViewChild, Input, Output, HostBinding} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';
// import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts
import {ToasterService} from '../utils/toaster.service'; // Likewise, this breaks if combined with import of Logger below
import {Logger} from '../utils/';

import * as _ from 'lodash';
import * as safeStringify from 'json-stringify-safe';

@Component({
  selector: 'tag-details',
  template: require('./tag-details.component.html')
})
export class TagDetailsComponent {
  _ = _; // for use in template
  safeStringify = safeStringify; // for use in template
  component = this; // for use in template

  DEFAULT_PANE = 'explore';
  activePane = this.DEFAULT_PANE;

  /** ID of tag that has been explored, if any. */
  exploreComputed: string;
  exploreStats: {
    topCooccurrences: [ { tag: Tag, numNotes: number }],
    bottomCooccurrences: [ { tag: Tag, numNotes: number }]
  };

  sortedChildTags: Tag[];

  hoveredTag?: Tag; // Tag that's currently hovered in cooccurrence lists (used to highlight tag in the visualization)

  @Input() tag: Tag;
  @Output() deleted = new EventEmitter<Tag>();

  /** We want to use `.tag-details` selector to style this so that we can have a "fake" component using same styles in homepage demo. Set that class here so we don't have to remember to do so whenever using <tag-details>. */
  @HostBinding('class.tag-details') thisIsUnusedAndAlwaysTrue = true;

  @ViewChild('tagDataRef') tagDataRef: ElementRef;

  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    // private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    private toaster: ToasterService,
    @Inject(forwardRef(() => TagsService)) private tagsService: TagsService,
    private router: Router,
  ) {
    // this.el = elRef.nativeElement;
  }

  _deleted(): void {
    if (this.tag.delete(true)) {
      this.deleted.emit(this.tag);
      this.router.navigateByUrl('/tags');

      // @TODO/ece Warning? Error?
      // @TODO Should have an undo button here
      this.toaster.warning('Deleted tag <b>#' + this.tag.name + '</b>');
    }
  }

  ngOnInit() {
    this.routerSub = this.router.events
      .filter((event) => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this));
    // Above won't trigger with current router state, so let's do so manually:
    this.routeUpdated(this.router);
  }

  ngOnDestroy() {
    this.routerSub.unsubscribe();
  }

  tagDataUpdated() {
    try {
      // @TODO/soon @TODO/prog This runs prog on all notes which will be too slow, need to just look at blacklisted ones... but that's specific to keywords tag. So probably need loading indicator AND really just need to use web web workers
      this.tag.data = JSON.parse(this.tagDataRef.nativeElement.textContent);
      setTimeout(this.setUpChildTags.bind(this), 0); // could have changed
    }
    catch (err) {
      this.toaster.error(
        '<code>' + err + '</code><p>Click to restore previously-valid JSON.</p>',
        'Error parsing tag data', {
        timeOut: 7500,
        onclick: () => {
          this.tagDataRef.nativeElement.innerHTML = safeStringify(this.tag.data, null, 2);
        }
      });
    }
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
      // Wait a tick while router change hits TagBrowserComponent and changes the tag that gets @Input into us. (We could do this on ngOnChanges instead, but since that fires before activePane is set up, we end up calculating states even if user isn't going to explore pane, and workaround for this is messy.)
      setTimeout(this.computeExplore.bind(this), 0);
    }
  }

  exploreReset(): void {
    this.exploreStats = {
      topCooccurrences: <[{ tag: Tag, numNotes: number }]> [],
      bottomCooccurrences: <[{ tag: Tag, numNotes: number }]> [],
    };

    delete this.sortedChildTags;
  }

  setUpChildTags(): void {
    if (this.tag.childTagIds.length) {
      this.sortedChildTags = this.tag.getChildTags().sort((a, b) => {
        return b.noteCount - a.noteCount;
      });
    }
  }

  computeExplore(): void {
    if (this.exploreComputed === this.tag.id) {
      return;
    }

    this._logger.time('Calculated explore stats');

    this.exploreReset();

    this.setUpChildTags();

    const cooccurrences: { [tagId: string]: number } = {}; // tagId => # of cooccurrences with the current tag
    let pairedTag: Tag;
    this.tag.getChildInclusiveNotes().forEach((note) => {
      // Now let's see what other tags these notes hav
      note.tags.forEach((tagId) => {
        if (tagId == this.tag.id) { // intentional == (we have some integer IDs floating around in data store) @TODO/refactor We should find-and-replace in firebase and get rid of these!
          return;
        }

        pairedTag = this.tagsService.tags[tagId];
        if (! pairedTag) {
          // @TODO I think/hope this stems from past problems with properly deleting tagIds from notes when deleting a tag. If this continues to show up in the future we have a problem.
          this._logger.warn('Note', note.id, 'appears to have non-existent tag with ID', tagId);
          return;
        }

        if (pairedTag.parentTagId === this.tag.id) {
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

      let tagId: string;
      let tag: Tag;

      while (_.size(sortedCooccurrences) && this.exploreStats.topCooccurrences.length < 5) {
        tagId = sortedCooccurrences.pop();
        tag = this.tagsService.tags[tagId];

        if (! tag) {
          continue;
        }

        this.exploreStats.topCooccurrences.push({
          tag: tag,
          numNotes: cooccurrences[tag.id]
        });
      }

      while (_.size(sortedCooccurrences) && this.exploreStats.bottomCooccurrences.length < 5) {
        tagId = sortedCooccurrences.shift();
        tag = this.tagsService.tags[tagId];

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

    this._logger.timeEnd('Calculated explore stats');
  }

  goToTaggedNotes(tags: Tag[]) {
    this.tagsService.dataService.activeUIs.noteQuery.goToQuery(tags);
  }

}
