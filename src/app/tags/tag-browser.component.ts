import {Component, ElementRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/debounceTime';

import {AnalyticsService} from '../analytics.service';
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
  // @ViewChildren(TagComponent) tagComponents: QueryList<TagComponent>;

  query: string;
  private queryUpdated$: Subject<void> = new Subject<void>();

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    // private autocompleteService: AutocompleteService,
    // private scrollMonitor: ScrollMonitorService,
    // private notesService: NotesService,
    private tagsService: TagsService,
  ) {
    this.el = elRef.nativeElement;

    // @TODO/rewrite/tags Ability to sort tags
    // this.queryUpdated$
    //   .debounceTime(250)
    //   .subscribe(() => {
    //     let queriedTags = this.tagsService.doQuery(this.query);
    //     this.tags = this.tagsService.sortTags(undefined, queriedTags);
    //   });
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

    // this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  initTags(): void {
    this.tags = this.tagsService.sortTags(this.sortOpt);
  }

  // newNote(noteData = {}): void {
  //   // @TODO/rewrite/notes Do we want to support config option that newly created notes have any tags that are currently in the query? Does this even make sense with separate note browser vs. note editor?
  //   const newNote = this.notesService.createNote(noteData);

  //   // Have to re-assign this.notes (rather than mutate it) otherwise the view won't update
  //   this.notes = _.concat([newNote], this.notes);

  //   // Have to wait cause angular hasn't updated the QueryList yet, but once it has, we can focus on the new note component
  //   setTimeout(() => {
  //     this.noteComponents.first.focus();
  //   }, 0);
  // }

  // /** Called when one of the notes in this component is deleted. */
  // noteDeleted(deletedNote: Note): void {
  //   // Have to re-assign this.notes (rather than mutate it) otherwise the view won't update
  //   this.notes = _.filter(this.notes, (note: Note) => note.id !== deletedNote.id);
  // }

  // queryUpdated(): void {
  //   this.queryUpdated$.next(null);
  // }

  // queryClear(): void {
  //   this.queryTags = [];
  //   this.query = '';
  //   this.queryUpdated();
  //   this.queryEnsureFocusAndAutocomplete();
  // }

  sort(sortOpt?): void {
    if (sortOpt) {
      this.sortOpt = sortOpt;
    }

    this.tags = this.tagsService.sortTags(this.sortOpt);
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
