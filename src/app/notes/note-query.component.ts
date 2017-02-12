import {Component, Output, EventEmitter, ViewChild, HostBinding, ElementRef} from '@angular/core';
import {ReplaySubject, Subject, Subscription} from 'rxjs';
import 'rxjs/add/operator/debounceTime';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {ModalService} from '../modals/modal.service';
import {SettingsService} from '../settings/settings.service';
import {Note} from './note.model';
import {NotesService} from './notes.service';
import {Tag, ChildTag, TagsService} from '../tags';
import {Logger, AutocompleteService, AutocompleteSuggestion, ToasterService} from '../utils/';
import {NOTE_BROWSER_ROUTES, routingInfo} from '../app.routes';

import * as _ from 'lodash';

@Component({
  selector: 'note-query',
  template: require('./note-query.component.html')
})
export class NoteQueryComponent {
  _notes: Array<Note> = [];

  routingInfo = routingInfo;
  ensureCorrectRoute = _.throttle(this._ensureCorrectRoute, 1000);

  /** How notes in this list component are sorted on init. */
  sortOpt: Object = this.notesService.sortOpts[0];

  queriedNotes$ = new ReplaySubject<Note[]>(1);

  /** On mobile this query bar is only visible sometimes. With this we can signal to parent whether it should be visible. */
  @Output() setVisibility = new EventEmitter<boolean>();

  @HostBinding('class.is--focused') hasFocus = false;

  @ViewChild('textInput') textInput: ElementRef;

  queryText: string;
  tags: Tag[] = [];
  tagsUpdated$ = new Subject<Tag[]>(); // the tags in the query, not tags in general
  private queryUpdated$ = new Subject<void>();
  private querySub: Subscription;
  private noteInitializationSub: Subscription;
  private noteUpdatedSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elementRef: ElementRef,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private modalService: ModalService,
    private toaster: ToasterService,
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
    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire
    this.noteInitializationSub = this.notesService.initialized$.subscribe(this.initNotes.bind(this));

    this.querySub = this.queryUpdated$
      .debounceTime(250)
      .subscribe(() => {
        this.notes = this.notesService.getNotes(this.queryText, this.tags, this.sortOpt);
      });
  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.noteInitializationSub.unsubscribe();
    this.noteUpdatedSub.unsubscribe();

    if (this.activeUIs.noteQuery === this) {
      this.activeUIs.noteQuery = null;
    }
  }

  initNotes(): void {
    this.sortOpt = _.find(this.notesService.sortOpts, { id: this.settings.get('nutSortBy') });

    this.notes = this.notesService.getNotes(this.queryText, this.tags, this.sortOpt);

    this.activeUIs.noteQuery = this;

    this.noteUpdatedSub = this.notesService.noteUpdated$.subscribe(this.noteUpdated.bind(this));
  }

  queryUpdated(): void {
    this.queryUpdated$.next(null);
  }

  focus(): void {
    this.textInput.nativeElement.focus();
  }
  focused(): void {
    this.hasFocus = true;
    this.active();
  }
  isFocused(): boolean {
    return document.activeElement === this.textInput.nativeElement;
  }
  blurred(): void {
    this.hasFocus = false;
    this.maybeInactive();
  }

  active(): void {
    (<HTMLElement> this.elementRef.nativeElement).classList.add('is--active');
  }
  maybeInactive(): void {
    if (! this.queryText && this.tags.length === 0 && ! this.isFocused()) {
      this.inactive();
    }
  }
  inactive(): void {
    (<HTMLElement> this.elementRef.nativeElement).classList.remove('is--active');
  }

  isEmpty(): boolean {
    return ! _.size(this.tags) && ! this.queryText;
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

  tagAutocompleteSelect(suggestion: AutocompleteSuggestion, e): void {
    this.queryText = '';

    if (suggestion.data && suggestion.data.tag) {
      this.addTag(suggestion.data.tag);
    }
    else {
      this._logger.error('Invalid suggestion returned: No data or tag found:', suggestion)
      throw Error('Invalid suggestion returned: No data or tag found');
    }

    this.ensureFocusAndAutocomplete();
  }

  ensureFocusAndAutocomplete(): void {
    if (! this.isFocused()) {
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
      const lastTag = this.tags[this.tags.length - 1];

      this.removeTag(lastTag);

      if (lastTag instanceof ChildTag) {
        this.addTag(this.tagsService.tags[lastTag.parentTagId]);
      }

      this.ensureFocusAndAutocomplete(); // reset autocomplete so that newly removed tag is in suggestions again
    }
  }

  addTag(tag: Tag): void {
    this.tags.push(tag);
    this.queryUpdated();

    this.tagsUpdated$.next(this.tags);

    this.active();
  }

  removeTag(tag: Tag, thenFocus = false): void {
    let i = this.tags.indexOf(tag);
    if (i !== -1) {
      this.tags.splice(i, 1);
      this.queryUpdated();

      this.tagsUpdated$.next(this.tags);
    }

    if (thenFocus) {
      this.focus();
    }
    else {
      this.maybeInactive();
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

      if (this.isEmpty()) {
        this.setVisibility.emit(false);
      }

      return;
    }

    if (! keep) {
      this.tags = [];
      this.queryText = '';
    }

    this.addTag(tag);

    if (! this.isEmpty()) {
      this.setVisibility.emit(true);
    }
  }

  clear(thenFocus = true): void {
    if (this.isEmpty()) {
      this.setVisibility.emit(false);
      return;
    }

    this.tags = [];
    this.tagsUpdated$.next(this.tags);

    this.queryText = '';
    this.queryUpdated();

    if (thenFocus) {
      this.ensureFocusAndAutocomplete();
      // No need to ensure correct route, cause focusing does that
    }
    else {
      this.inactive();
      this.ensureCorrectRoute();
    }
  }

  ngSelectSelected(option): void {
    // ngSelect just gives us back object with id and text. We need to get full sortOpt:
    const sortOpt = _.find(this.notesService.sortOpts, { id: option.id });
    this.sort(sortOpt);
    this.active();
    setTimeout(this.focus.bind(this), 0);
  }

  sort(sortOpt): void {
    this.settings.set('nutSortBy', sortOpt.id);
    this.sortOpt = sortOpt;
    this.notes = this.notesService.sortNotes(this.sortOpt, this.notes);
  }

  /**
   * Check if the updated note should be added or removed from currently visible notes. If note was deleted we simply remove note from visible notes if necessary.
   * @TODO Make sure to maintain scroll position
   * @TODO/optimization During `tag.runProgOnAllNotes` (and any other actions that cause mass updates of notes, like tag deletion) this function gets run once for every note that's updated. It's true that we need to check if each note shouldn't/shouldn't be shown, but in this case we should kind of throttle the check: on first call, do this. If second call comes too quickly, wait til calls don't come in for a while and then simply redo the entire query rather than checking each note individually.
   */
  noteUpdated(note: Note) {
    if (note.deleted) {
      this.noteDeleted(note);
      return;
    }

    // No need to sort yet, first let's just see if we need to add/remove note:
    const newNoteList = this.notesService.doQuery(this.queryText, this.tags);

    if (_.includes(this.notes, note)) {
      if (! _.includes(newNoteList, note)) {
        this._logger.log('Updated note was visible but shouldn\'t be any more:', note);
        // @TODO/toaster @TODO/polish If the note component is visible in viewport, we should show toaster notification about why note is no longer visible, and maybe click to clear query or see note again
        this.notes = _.without(this.notes, note);
      }
      else {
        // Note was visible and should remain visible

        if (note.updateSortHack) {
          // But we should explicitly re-sort
          note.updateSortHack = false;

          this.notes = this.notesService.sortNotes(this.sortOpt, this.notes);

          if (note.archived) {
            // @TODO/ece Should this be a button on the toaster?
            this.toaster.info('<a>Undo</a>', 'Note archived', {
              onclick: () => {
                note.archived = false;
              },
              preventDuplicates: true,
              toastClass: 'toast toast--archived',
            });
          }
          else if (note.pinned) {
            // @TODO/ece Should this be a button on the toaster?
            // @TODO/ece Do we even want to show a toaster here? A "never show me again" might be useful, but then that would be two buttons on a toaster, which is bad form according to google. We could put "never show this message again" in the modal. But either way not implementing "don't show again" options for now.
            this.toaster.info('<a>Learn more</a>', 'Note pinned', {
              onclick: () => {
                this.modalService.alert('<h3>Pinning and archiving</h3><p><b>Pinned</b> notes will always appear above un-pinned notes, but, like all notes, they are only shown if they match what you put in the search bar.</p><p>Likewise, <b>archived</b> notes will always appear below other notes.</p><p>You can specifically search for archived or pinned notes by treating them as tags: you can type "archived" or "pinned" in the search bar and choose them from the autocomplete dropdown.</p>', true, 'Thanks'); // @TODO/ece Is "thanks" sassy here? Shouldnt' make a habit of it, but things other than "ok" are good.
              },
              preventDuplicates: true,
              toastClass: 'toast toast--pinned',
            });
          }
        }
      }
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

  // Clears query and ensures that we're on a a route where notes are visible
  clearAndEnsureRoute(defaultRoute?): void {
    this.clear(false);
    this.ensureCorrectRoute();
  }


  private _ensureCorrectRoute() {
    if (! _.includes(NOTE_BROWSER_ROUTES, this.notesService.dataService.router.url)) {
      this.notesService.dataService.router.navigateByUrl(this.routingInfo.lastNoteRoute);
    }
  }

}
