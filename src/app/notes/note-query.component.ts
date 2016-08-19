import {Component, ViewChild, ElementRef} from '@angular/core';
import {ReplaySubject, Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Note} from './note.model';
import {NotesService} from './notes.service';
import {Tag, TagComponent, TagsService} from '../tags';
import {Logger, AutocompleteService} from '../utils/';

@Component({
  selector: 'note-query',
  pipes: [],
  directives: [
    TagComponent,
  ],
  template: require('./note-query.component.html')
})
export class NoteQueryComponent {
  _notes: Array<Note> = [];

  /** How notes in this list component are sorted on init. */
  sortOpt: Object = this.notesService.sortOpts[0];

  queriedNotes$ = new ReplaySubject<Note[]>(1);

  @ViewChild('textInput') textInput: ElementRef; 

  queryText: string;
  tags: Tag[] = [];
  tagsUpdated$ = new Subject<Tag[]>();
  private queryUpdated$ = new Subject<void>();
  private querySub: Subscription;
  private noteUpdatedSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private settings: SettingsService,
    private notesService: NotesService,
    private tagsService: TagsService,
  ) {
  }

  get notes(): Note[] {
    return this._notes;
  }
  set notes(notes: Note[]) {
    this._notes = notes;
    this.queriedNotes$.next(this._notes);
  }

  ngOnInit() {
    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire. Either way, will unsubscribe immediately after.
    this.notesService.initialized$.first().subscribe(this.initNotes.bind(this));

    this.querySub = this.queryUpdated$
      .debounceTime(250)
      .subscribe(() => {
        this.notes = this.notesService.getNotes(this.queryText, this.tags, this.sortOpt);
      });

  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.noteUpdatedSub.unsubscribe();

    if (this.activeUIs.noteQuery === this) {
      this.activeUIs.noteQuery = null;
    }
  }

  initNotes(): void {
    this.sortOpt = _.find(this.notesService.sortOpts, { id: this.settings.get('nutSortBy') });

    this.notes = this.notesService.sortNotes(this.sortOpt);

    this.activeUIs.noteQuery = this;

    this.noteUpdatedSub = this.notesService.noteUpdated$.subscribe(this.noteUpdated.bind(this));
  }

  queryUpdated(): void {
    this.queryUpdated$.next(null);
  }

  focus(): void {
    this.textInput.nativeElement.focus();
  }

  setUpAutocomplete(): void {
    this.autocompleteService.autocompleteTags({
      context: 'query',
      el: this.textInput.nativeElement,
      excludeTags: this.tags,
      autocompleteOpts: {
        onSelect: this.tagAutocompleteSelect.bind(this)
      }
    });
  }

  tagAutocompleteSelect(suggestion, e): void {
    this.queryText = '';
    this.addTag(this.tagsService.getTagByName(suggestion.value));
    this.ensureFocusAndAutocomplete();
  }

  ensureFocusAndAutocomplete(): void {
    if (document.activeElement !== this.textInput.nativeElement) {
      // Lost focus on the input (user may have clicked on autocomplete suggestion or clicked on a tag to remove it, etc.)
      this.focus(); // this will trigger setUpAutocomplete
    }
    else {
      this.setUpAutocomplete(); // reset autocomplete so that newly added tag will not be in suggestions
    }
  }

  /**
   * Backspace in first position of searchbar when there are tags should delete last tag
   * @TODO: not sure in what browsers selectionStart works, but it's not all. Make sure that it doesn't always return 0 in some browsers, cause then we'll be deleting with every backspace.
   */
  inputKeydown(event: KeyboardEvent): void {
    if (event.keyCode === 8
      && this.textInput.nativeElement.selectionStart === 0
      && this.textInput.nativeElement.selectionEnd === 0 // otherwise select all + backspace will trigger
      && this.tags.length > 0
    ) {
      this.removeTag(this.tags[this.tags.length - 1]);
      this.ensureFocusAndAutocomplete(); // reset autocomplete so that newly removed tag is in suggestions again
    }
  }

  addTag(tag: Tag): void {
    this.tags.push(tag);
    this.queryUpdated();

    this.tagsUpdated$.next(this.tags);
  }

  removeTag(tag: Tag): void {
    let i = this.tags.indexOf(tag);
    if (i !== -1) {
      this.tags.splice(i, 1);
      this.queryUpdated();

      this.tagsUpdated$.next(this.tags);
    }
  }

  /**
   * Behavior:
   *
   * - If tag is already in query, remove
   * - If tag is not already in query:
   *   - If user didn't elect to keep (e.g. DIDN'T hold shift while clicking on tag), replace all tags in current query with tag and clear query text
   *   - Otherwise, add the tag to the current query
   */
  tagToggled(tagId: string, keep: boolean): void {
    const tag = this.tagsService.tags[tagId];

    if (this.tags.indexOf(tag) !== -1) {
      this.removeTag(tag);
      return;
    }

    if (! keep) {
      this.tags = [];
      this.queryText = '';
    }

    this.addTag(tag);
  }

  clear(thenFocus = true): void {
    this.tags = [];
    this.queryText = '';
    this.queryUpdated();

    if (thenFocus) {
      this.ensureFocusAndAutocomplete();
    }
  }

  sort(sortOpt): void {
    this.settings.set('nutSortBy', sortOpt.id);
    this.sortOpt = sortOpt;
    this.notes = this.notesService.sortNotes(this.sortOpt, this.notes);
  }

  /**
   * Check if the updated note should be added or removed from currently visible notes. If note was deleted we simply remove note from visible notes if necessary.
   * @TODO Make sure to maintain scroll position
   * @TODO Ideally when removing a note, we should show some indicator about how the note is no longer visible due to query (and button to clear query)
   */
  noteUpdated(note: Note) {
    if (note.deleted) {
      this.noteDeleted(note);
      return;
    }

    // No need to sort yet, first let's just see if we need to add/remove note:
    const newNoteList = this.notesService.doQuery(this.queryText, this.tags);

    if (_.includes(this.notes, note) && ! _.includes(newNoteList, note)) {
      this._logger.log('Updated note was visible but shouldn\'t be any more:', note);
      this.notes = _.without(this.notes, note);
    }
    else if (! _.includes(this.notes, note) && _.includes(newNoteList, note)) {
      this._logger.log('Updated note wasn\'t visible but should be now:', note);
      this.notes = this.notesService.sortNotes(this.sortOpt, newNoteList);
    }
  }

  noteDeleted(deletedNote: Note): void {
    if (! _.includes(this.notes, deletedNote)) {
      // Don't have to update our notes cause this one wasn't visible
      return;
    }

    // Have to re-assign this.notes (rather than mutate it) otherwise the view won't update
    this.notes = _.without(this.notes, deletedNote);
  }

}
