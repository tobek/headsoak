import {Component, ElementRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
// import {Note} from '../notes/note.model';
// import {NoteComponent} from '../notes/note.component';
// import {NotesService} from '../notes/notes.service';
import {Tag, TagComponent, TagsService} from './';
import {Logger/*, ScrollMonitorService, AutocompleteService*/} from '../utils/';

@Component({
  selector: 'tag-browser',
  pipes: [],
  directives: [
    TagComponent,
  ],
  styles: [require('./tag-browser.component.css')],
  template: require('./tag-browser.component.html')
})
export class TagBrowserComponent {
  DEFAULT_TAGS_LIMIT: number = 100;

  el: HTMLElement;

  tags: Tag[] = [];

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_TAGS_LIMIT;

  /** How tags in this list component are sorted on init. @TODO/rewrite/config load from config. */
  sortOpt: Object = this.tagsService.sortOpts[0];

  @ViewChild('queryInput') queryInput: ElementRef;
  @ViewChildren(TagComponent) tagComponents: QueryList<TagComponent>;

  query: string;
  private queryUpdated$: Subject<void> = new Subject<void>();

  private querySub: Subscription;
  // private scrollSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
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
    if (! _.isEmpty(this.tagsService.tags)) {
      this.initTags();
    }
    else {
      let subscription = this.tagsService.initialized$.subscribe(() => {
        this.initTags();
        subscription.unsubscribe();
      });
    }

    this.querySub = this.queryUpdated$
      .debounceTime(200)
      .subscribe(() => {
        // @TODO/tags Ideally this should use fuzzy match sorter (and bold matching parts of tag names)
        let queriedTags = _.filter(this.tagsService.tags, (tag: Tag) => {
          return tag.name.toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
        });
        this.tags = this.tagsService.sortTags(this.sortOpt, queriedTags);
      });

    // this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    // this.scrollSub.unsubscribe();
  }

  initTags(): void {
    this.sortOpt = _.find(this.tagsService.sortOpts, { id: this.settings.tagSortBy });

    this.tags = this.tagsService.sortTags(this.sortOpt);
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
      this.settings.data['tagSortBy'].updated(sortOpt.id);
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

  tagToggled(tag: Tag): void {
    // @TODO/rewrite/tags Need to find a way to toggle this tag in the appropriate note browser component
    this._logger.log('Toggling tag', tag);
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
