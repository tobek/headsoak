import {Component, ElementRef, ViewChild} from '@angular/core';
import {Subject} from 'rxjs/Subject';
import 'rxjs/add/operator/distinctUntilChanged';

import {AnalyticsService} from '../analytics.service';
import {Note} from './note.model';
import {NoteComponent} from './note.component';
import {NotesService} from './notes.service';
import {Tag, TagComponent, TagsService} from '../tags';
import {Logger, ScrollMonitorService, AutocompleteService} from '../utils/';

@Component({
  selector: 'note-list',
  pipes: [],
  directives: [
    NoteComponent,
    TagComponent,
  ],
  styles: [require('./note-list.component.css')],
  template: require('./note-list.component.html')
})
export class NoteListComponent {
  DEFAULT_NOTES_LIMIT: number = 15;

  el: HTMLElement;

  /** Dynamically generated partial or complete copy of notes, sorted and filtered according to the user. **Each element of the array is a reference to a Note object in `NotesService`.** This means that neither `NotesService.notes` nor `notes` here should directly reassign any of its elements, or else things will go out of sync. @TODO/rewrite this comment was from old nutmeg, only modified to update variable names - is it still accurate? If not then for every notelist component we're going to have a crapload of note objects floating around in memory, and it's not certain that they'll remain updated across the board. NEED TO CONFIRM (look at notes service `sortNotes`. unless we're doing something funky, by default it looks like JS should be working this out as references to objects, which is good. looking into `sortNotes`, i think that as long as `_.sortBy` and Array.prototype.reverse don't break references and make new objects (why would they?) we're good (okay just confirmed that array reverse doesn't break references)) */
  notes: Array<Note>;

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_NOTES_LIMIT;

  /** How notes in this list component are sorted on init. @TODO/rewrite/config load from config. */
  sortOpt: Object = this.notesService.sortOpts[0];

  @ViewChild('queryInput') queryInput: ElementRef;

  query: string;
  private queryEmitter$: Subject<string> = new Subject<string>();
  queryTags: Tag[] = [];

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private scrollMonitor: ScrollMonitorService,
    private notesService: NotesService,
    private tagsService: TagsService,
  ) {
    this.el = elRef.nativeElement;

    this.queryEmitter$
      .debounceTime(250)
      .distinctUntilChanged()
      .subscribe(query => {
        let queriedNotes = this.notesService.doQuery(this.query, this.queryTags);
        this.notes = this.notesService.sortNotes(undefined, queriedNotes);
      });
  }

  queryUpdated() {
    this.queryEmitter$.next(this.query);
  }

  querySetUpAutocomplete() {
    this.autocompleteService.autocompleteTags({
      context: 'query',
      el: this.queryInput.nativeElement,
      excludeTags: this.queryTags,
      autocompleteOpts: {
        onSelect: (suggestion, event) => {
          this.queryAddTag(this.tagsService.getTagByName(suggestion.value));
          this.query = '';
          this.queryUpdated();
          this.querySetUpAutocomplete(); // reset autocomplete so that newly added tag will not be in suggestions
        }
      }
    });
  }

  queryAddTag(tag: Tag) {
    this.queryTags.push(tag);
  }

  sort(sortOpt) {
    this.sortOpt = sortOpt;
    this.notes = this.notesService.sortNotes(this.sortOpt, this.notes);
  }

  ngOnInit() {
    if (! _.isEmpty(this.notesService.notes)) {
      this.initNotes();
    }
    else {
      var subscription = this.notesService.updates$.subscribe(() => {
        this.initNotes();
        subscription.unsubscribe();
      });
    }

    this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  initNotes() {
    // @NOTE @todo/rewrite since we feed this through the pure ArrayLimitPipe, the pipe won't re-evaluate if this array is changed, only if this.notes is actually made to point to a different array. So either we make it an unpure pipe (which is costly) or we reassign this.notes when sorting (which we might want to do anyway)
    this.notes = this.notesService.sortNotes(this.sortOpt);

    // @TODO/rewrite
    // $timeout($s.n.autosizeAllNuts);
  }

  // @TODO/testing infinite scroll e2e both directions
  infiniteScrollCheck() {
    if (! this.notes || this.limit >= this.notes.length) {
      return;
    }

    var lastNote = this.el.querySelector('note:last-child');
    if (! lastNote) {
      return;
    }

    var scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    var viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
    var distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

    if (distanceTilLastNote < 500) {
      this.limit += 10;

      this._logger.log('Showing more notes: now showing', this.limit);

      // @TODO/rewrite
      // $s.n.autosizeSomeNuts($s.n.nutsLimit - 10); // only the new ones
    }
    else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
      var tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
      if (! tenthFromlastNote) {
        return;
      }

      if (tenthFromlastNote.getBoundingClientRect().top - viewportBottomPos > 500) {
        this.limit -= 10;

        this._logger.log('Showing fewer nuts: now showing', this.limit);
      }
    }
  }

}
