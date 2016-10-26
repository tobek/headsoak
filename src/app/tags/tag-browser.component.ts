import {Component, ElementRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
// import {Note} from '../notes/note.model';
// import {NoteComponent} from '../notes/note.component';
// import {NotesService} from '../notes/notes.service';
import {Tag, TagComponent, TagDetailsComponent, TagsService, TagVisualizationComponent, ProgTagLibraryComponent} from './';
import {Logger/*, ScrollMonitorService, AutocompleteService*/} from '../utils/';

@Component({
  selector: 'tag-browser',
  pipes: [],
  directives: [
    TagComponent,
    TagDetailsComponent,
    TagVisualizationComponent,
    ProgTagLibraryComponent,
  ],
  template: require('./tag-browser.component.html')
})
export class TagBrowserComponent {
  DEFAULT_TAGS_LIMIT: number = Infinity; // @TODO/tags There should prob be a limit?

  el: HTMLElement;

  tags: Tag[] = [];
  activeTag: Tag; // Tag that's currently being show in details view

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_TAGS_LIMIT;

  /** How tags in this list component are sorted on init. */
  sortOpt: Object = this.tagsService.sortOpts[0];

  activePane: 'viz' | 'library';

  @ViewChild('queryInput') queryInput: ElementRef;
  @ViewChildren(TagComponent) tagComponents: QueryList<TagComponent>;

  query = '';
  private queryUpdated$: Subject<void> = new Subject<void>();

  private querySub: Subscription;
  private routerSub: Subscription;
  private tagInitializationSub: Subscription;
  private tagCreationSub: Subscription;
  private tagDeletionSub: Subscription;
  // private scrollSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private router: Router,
    private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    private settings: SettingsService,
    // private autocompleteService: AutocompleteService,
    // private scrollMonitor: ScrollMonitorService,
    // private notesService: NotesService,
    private tagsService: TagsService,
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire.
    this.tagInitializationSub = this.tagsService.initialized$.subscribe(this.initTags.bind(this));

    this.querySub = this.queryUpdated$
      .debounceTime(200)
      .subscribe(() => {
        // @TODO/tags Ideally this should use fuzzy match sorter (and bold matching parts of tag names)
        let queriedTags = _.filter(this.tagsService.tags, (tag: Tag) => {
          return tag.name.toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
        });
        this.tags = this.tagsService.sortTags(this.sortOpt, queriedTags);
      });

    this.tagCreationSub = this.tagsService.tagCreated$.subscribe(this.queryUpdated.bind(this));
    this.tagDeletionSub = this.tagsService.tagDeleted$.subscribe(this.tagDeleted.bind(this));

    // this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.routerSub.unsubscribe();
    this.tagInitializationSub.unsubscribe();
    this.tagCreationSub.unsubscribe();
    this.tagDeletionSub.unsubscribe();
    // this.scrollSub.unsubscribe();
  }

  initTags(): void {
    this.sortOpt = _.find(this.tagsService.sortOpts, { id: this.settings.get('tagSortBy') });

    this.tags = this.tagsService.sortTags(this.sortOpt);

    this.routerSub = this.router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this));
    // Above won't trigger with current router state, so let's do so manually:
    this.routeUpdated(this.router);
  }

  routeUpdated(event: NavigationEnd | Router) {
    // @HACK Should be able to subscribe to just param events via ActivatedRoute to get tag ID from `/tags/:tagId...` paths the params observer isn't firing - might be because of the EmptyComponents hack or maybe a bug that's fixed in later version, but anyway here we go:
    const pathParts = event.url.substring(1).split('/');

    if (pathParts[0] !== 'tags') {
      this.activeTag = null;
      this.activePane = null;
      return;
    }
    
    if (pathParts[1] === 'tag') {
      this.activeTag = this.tagsService.tags[pathParts[2]];
      this.activePane = null;
    }
    else {
      this.activeTag = null;

      if (event.url.indexOf('smart-tags/library') !== -1) {
        this.activePane = 'library';
      }
      else {
        this.activePane = 'viz';
      }
    }
  }

  queryUpdated(): void {
    this.queryUpdated$.next(null);
  }

  queryClear(): void {
    this.query = '';
    this.queryUpdated();
  }

  sort(sortOpt?): void {
    if (sortOpt) {
      this.settings.set('tagSortBy', sortOpt.id);
      this.sortOpt = sortOpt;
    }

    this.tags = this.tagsService.sortTags(this.sortOpt);
  }

  newTag(): void {
    const newTag = this.tagsService.createTag();

    this.tags = _.concat([newTag], this.tags);

    // Have to wait cause angular hasn't updated the QueryList yet, but once it has, we can focus on the new tag component
    setTimeout(() => {
      this.tagComponents.first.renameStart();
    }, 0);
  }

  /** Called when one of the tags in this component is deleted. */
  tagDeleted(deletedTag: Tag): void {
    this.tags = _.filter(this.tags, (tag: Tag) => tag.id !== deletedTag.id);
  }

  // // @TODO/testing infinite scroll e2e both directions
  // infiniteScrollCheck(): void {
  //   if (! this.notes || this.limit >= this.notes.length) {
  //     return;
  //   }

  //   let lastNote = this.el.querySelector('note:last-child');
  //   if (! lastNote) {
  //     return;
  //   }

  //   let scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
  //   let viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
  //   let distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

  //   if (distanceTilLastNote < 500) {
  //     this.limit += 10;

  //     this._logger.log('Showing more notes: now showing', this.limit);

  //     // @TODO/rewrite
  //     // $s.n.autosizeSomeNuts($s.n.nutsLimit - 10); // only the new ones
  //   }
  //   else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
  //     let tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
  //     if (! tenthFromlastNote) {
  //       return;
  //     }

  //     if (tenthFromlastNote.getBoundingClientRect().top - viewportBottomPos > 500) {
  //       this.limit -= 10;

  //       this._logger.log('Showing fewer nuts: now showing', this.limit);
  //     }
  //   }
  // }

}
