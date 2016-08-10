import {Component, ElementRef, ViewChild, ViewChildren, QueryList} from '@angular/core';
import {Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {Note} from './note.model';
import {NoteComponent} from './note.component';
import {NotesService} from './notes.service';
import {Tag, TagComponent, TagsService} from '../tags';
import {Logger, ScrollMonitorService, AutocompleteService} from '../utils/';

@Component({
  selector: 'note-browser',
  pipes: [],
  directives: [
    NoteComponent,
    TagComponent,
  ],
  styles: [require('./note-browser.component.css')],
  template: require('./note-browser.component.html')
})
export class NoteBrowserComponent {
  DEFAULT_NOTES_LIMIT: number = 15;

  el: HTMLElement;

  /** Dynamically generated partial or complete copy of notes, sorted and filtered according to the user. **Each element of the array is a reference to a Note object in `NotesService`.** This means that neither `NotesService.notes` nor `notes` here should directly reassign any of its elements, or else things will go out of sync. @TODO/rewrite this comment was from old nutmeg, only modified to update variable names - is it still accurate? If not then for every notelist component we're going to have a crapload of note objects floating around in memory, and it's not certain that they'll remain updated across the board. NEED TO CONFIRM (look at notes service `sortNotes`. unless we're doing something funky, by default it looks like JS should be working this out as references to objects, which is good. looking into `sortNotes`, i think that as long as `_.sortBy` and Array.prototype.reverse don't break references and make new objects (why would they?) we're good (okay just confirmed that array reverse doesn't break references)) */
  notes: Array<Note> = [];

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_NOTES_LIMIT;

  /** How notes in this list component are sorted on init. @TODO/rewrite/config load from config. */
  sortOpt: Object = this.notesService.sortOpts[0];

  @ViewChild('queryInput') queryInput: ElementRef;
  @ViewChildren(NoteComponent) noteComponents: QueryList<NoteComponent>;

  query: string;
  queryTags: Tag[] = [];
  private queryUpdated$: Subject<void> = new Subject<void>();

  private querySub: Subscription;
  private scrollSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private scrollMonitor: ScrollMonitorService,
    private notesService: NotesService,
    private tagsService: TagsService,
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    if (! _.isEmpty(this.notesService.notes)) {
      this.initNotes();
    }
    else {
      let subscription = this.notesService.initialized$.subscribe(() => {
        this.initNotes();
        subscription.unsubscribe();
      });
    }

    this.querySub = this.queryUpdated$
      .debounceTime(250)
      .subscribe(() => {
        let queriedNotes = this.notesService.doQuery(this.query, this.queryTags);
        this.notes = this.notesService.sortNotes(undefined, queriedNotes);
      });

    this.scrollSub = this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.scrollSub.unsubscribe();

    if (this.activeUIs.noteBrowser === this) {
      this.activeUIs.noteBrowser = null;
    }
  }

  initNotes(): void {
    // @NOTE @todo/rewrite since we feed this through the pure ArrayLimitPipe, the pipe won't re-evaluate if this array is changed, only if this.notes is actually made to point to a different array. So either we make it an unpure pipe (which is costly) or we reassign this.notes when sorting (which we might want to do anyway)
    this.notes = this.notesService.sortNotes(this.sortOpt);

    // @TODO/rewrite
    // $timeout($s.n.autosizeAllNuts);

    this.activeUIs.noteBrowser = this;
  }

  newNote(noteData = {}, thenFocus = true, callback?: (noteComponent: NoteComponent) => any): void {
    // @TODO/rewrite/notes Do we want to support config option that newly created notes have any tags that are currently in the query? Does this even make sense with separate note browser vs. note editor?
    const newNote = this.notesService.createNote(noteData);

    // Have to re-assign this.notes (rather than mutate it) otherwise the view won't update
    this.notes = _.concat([newNote], this.notes);

    // Have to wait cause angular hasn't updated the QueryList yet so wait for it:
    const sub = this.noteComponents.changes.subscribe(() => {
      sub.unsubscribe();

      if (thenFocus) {
        this.noteComponents.first.bodyFocus();
      }

      if (callback) {
        callback(this.noteComponents.first);
      }
    });
  }

  newNoteAddTag(): void {
    this.newNote({}, false, (noteComponent: NoteComponent) => {
      noteComponent.initializeAddTag();
      noteComponent.cdrRef.detectChanges();
    });
  }

  newNoteWithSameTags(note: Note): void {
    this.newNote({
      tags: note.tags.filter((tagId: string) => {
        const tag = this.tagsService.tags[tagId];
        return ! tag.prog && ! tag.readOnly;
      })
    });
  }

  /** Called when one of the notes in this component is deleted. */
  noteDeleted(deletedNote: Note): void {
    // Have to re-assign this.notes (rather than mutate it) otherwise the view won't update
    this.notes = _.filter(this.notes, (note: Note) => note.id !== deletedNote.id);
  }

  queryUpdated(): void {
    this.queryUpdated$.next(null);
  }

  queryFocus(): void {
    this.queryInput.nativeElement.focus();
  }

  querySetUpAutocomplete(): void {
    this.autocompleteService.autocompleteTags({
      context: 'query',
      el: this.queryInput.nativeElement,
      excludeTags: this.queryTags,
      autocompleteOpts: {
        onSelect: this.queryTagAutocompleteSelect.bind(this)
      }
    });
  }

  queryTagAutocompleteSelect(suggestion, e): void {
    this.query = '';
    this.queryAddTag(this.tagsService.getTagByName(suggestion.value));
    this.queryEnsureFocusAndAutocomplete();
  }

  queryEnsureFocusAndAutocomplete(): void {
    if (document.activeElement !== this.queryInput.nativeElement) {
      // Lost focus on the input (user may have clicked on autocomplete suggestion or clicked on a tag to remove it, etc.)
      this.queryFocus(); // this will trigger querySetUpAutocomplete
    }
    else {
      this.querySetUpAutocomplete(); // reset autocomplete so that newly added tag will not be in suggestions
    }
  }

  /**
   * Backspace in first position of searchbar when there are tags should delete last tag
   * @TODO: not sure in what browsers selectionStart works, but it's not all. Make sure that it doesn't always return 0 in some browsers, cause then we'll be deleting with every backspace.
   */
  queryKeydown(event: KeyboardEvent): void {
    if (event.keyCode === 8
      && this.queryInput.nativeElement.selectionStart === 0
      && this.queryInput.nativeElement.selectionEnd === 0 // otherwise select all + backspace will trigger
      && this.queryTags.length > 0
    ) {
      this.queryRemoveTag(this.queryTags[this.queryTags.length - 1]);
      this.queryEnsureFocusAndAutocomplete(); // reset autocomplete so that newly removed tag is in suggestions again
    }
  }

  queryAddTag(tag: Tag): void {
    this.queryTags.push(tag);
    this.queryUpdated();
  }

  queryRemoveTag(tag: Tag): void {
    let i = this.queryTags.indexOf(tag);
    if (i !== -1) {
      this.queryTags.splice(i, 1);
      this.queryUpdated();
    }
  }

  /**
   * Behavior:
   *
   * - If tag is already in query, remove
   * - If tag is not already in query:
   *   - If user elected to replace (e.g. DIDN'T hold shift while clicking on tag), replace all tags in current query with tag 
   *   - Otherwise, add the tag to the current query
   *
   *  @TODO/rewrite @TODO/ece - thoughts? Maybe shift vs. not shift should be reversed. Should text input be replaced too?
   */
  queryTagToggled(tagId: string, replace: boolean): void {
    const tag = this.tagsService.tags[tagId];

    if (this.queryTags.indexOf(tag) !== -1) {
      this.queryRemoveTag(tag);
      return;
    }

    if (replace) {
      this.queryTags = [];
    }

    this.queryAddTag(tag);
  }

  queryClear(thenFocus = true): void {
    this.queryTags = [];
    this.query = '';
    this.queryUpdated();

    if (thenFocus) {
      this.queryEnsureFocusAndAutocomplete();
    }
  }

  sort(sortOpt): void {
    this.sortOpt = sortOpt;
    this.notes = this.notesService.sortNotes(this.sortOpt, this.notes);
  }

  // @TODO/testing infinite scroll e2e both directions
  infiniteScrollCheck(): void {
    if (! this.notes || this.limit >= this.notes.length) {
      return;
    }

    let lastNote = this.el.querySelector('note:last-child');
    if (! lastNote) {
      return;
    }

    let scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    let viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
    let distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

    if (distanceTilLastNote < 500) {
      this.limit += 10;

      this._logger.log('Showing more notes: now showing', this.limit);

      // @TODO/rewrite
      // $s.n.autosizeSomeNuts($s.n.nutsLimit - 10); // only the new ones
    }
    else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
      let tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
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
