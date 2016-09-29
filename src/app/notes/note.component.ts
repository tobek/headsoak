import {Component, EventEmitter, ElementRef, Input, Output, ViewChild, ChangeDetectorRef} from '@angular/core';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Note} from '../notes/note.model';
import {NotesService} from '../notes/notes.service';
import {TagComponent} from '../tags/';

import {AutocompleteService} from '../utils/';

@Component({
  selector: 'note',
  pipes: [],
  directives: [
    TagComponent,
  ],
  template: require('./note.component.html')
})
export class NoteComponent {
  /** Currently entered text in the "add tag" field */
  addTagName = '';
  /** Whether the "add tag" field is active */
  addingTag = false;

  @Input() note: Note;
  @Input() opened = false;
  @Output() noteOpened = new EventEmitter<Note>();
  @Output() noteClosed = new EventEmitter<Note>();
  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  private boundCloseAddTagFieldHandler = this.closeAddTagFieldHandler.bind(this);

  constructor(
    public cdrRef: ChangeDetectorRef,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private settings: SettingsService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  openNote() {
    this.noteOpened.emit(this.note);
  }

  closeNote() {
    this.noteClosed.emit(this.note);
  }

  toggleTag(tagId: string, event: MouseEvent) {
    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.tagToggled(tagId, event && event.shiftKey);
    }
  }

  bodyFocus() {
    if (this.bodyInputRef) {
      this.bodyInputRef.nativeElement.focus();
    }
    else {
      setTimeout(() => {
        if (this.bodyInputRef) {
          this.bodyInputRef.nativeElement.focus();
        }
      }, 5);
    }
  }

  bodyFocused() {
    this.activeUIs.focusedNoteComponent = this;
    this.note.focused();
  }

  bodyBlurred() {
    if (this.activeUIs.focusedNoteComponent === this) {
      this.activeUIs.focusedNoteComponent = null;
    }
    this.note.blurred();
  }

  addTagFocused() {
    // We can't rely on blur to close the tag field because then clicking on add tag button also closes tag field.
    window.removeEventListener('click', this.boundCloseAddTagFieldHandler);
    window.addEventListener('click', this.boundCloseAddTagFieldHandler);

    this.addTagSetUpAutocomplete();

    // This still counts as the focused note component - e.g. delete shortcut while in add tag field should still delete the note.
    this.activeUIs.focusedNoteComponent = this;
  }

  addTagSetUpAutocomplete(): void {
    this.autocompleteService.autocompleteTags({
      context: 'note',
      el: this.addTagInputRef.nativeElement,
      excludeTagIds: this.note.tags,
      autocompleteOpts: {
        onSelect: this.addTagAutocompleteSelect.bind(this)
      }
    });
  }

  addTagAutocompleteSelect(suggestion, event): void {
    event.preventDefault();
    event.stopPropagation();

    const defaultAddAnother = ! event.shiftKey && ! event.ctrlKey;

    this.completeAddTag(suggestion.value, defaultAddAnother);
  }

  closeAddTagFieldHandler(event: MouseEvent) {
    const clickedEl = <HTMLElement> event.target;
    if (clickedEl &&
      (clickedEl.classList.contains('new-tag-button') || clickedEl.classList.contains('new-tag-input'))
      ) {
      return;
    }
    else if (document.querySelector('.autocomplete-suggestions').contains(clickedEl)) {
      return;
    }

    this.closeAddTagField();
  }
  
  closeAddTagField(focusOnBody = false) {
    window.removeEventListener('click', this.boundCloseAddTagFieldHandler);
    this.addingTag = false;

    if (this.activeUIs.focusedNoteComponent === this) {
      this.activeUIs.focusedNoteComponent = null;
    }

    if (focusOnBody) {
      this.bodyFocus();
    }
  }

  newTagClick(): void {
    if (! this.addingTag) {
      this.initializeAddTag();
    }
  }
  newTagIconClick(event: MouseEvent): void {
    if (this.addingTag) {
      event.stopPropagation();
      this.completeAddTag();
    }
  }

  initializeAddTag(tagText = this.addTagName, focusOnBody = true): void {
    // @HACK: Not sure why, but using the font-awesome icons inside the add tag button is prevent the addingTag state and/or focus unless we do it in the next tick:
    setTimeout(() => {
      this.addingTag = true;
      this.addTagInputRef.nativeElement.focus();
    }, 0);
  }

  completeAddTag(tagText = this.addTagName, defaultAddAnother = true): void {
    const addAnother = defaultAddAnother ? this.settings.get('addAnotherTag') : ! this.settings.get('addAnotherTag');

    if (tagText === '') {
      this.closeAddTagField(true);
      return;
    }

    const tagAdded = this.note.addTagFromText(tagText);

    if (tagAdded) {
      this.addTagName = '';

      this.closeAddTagField(! addAnother);
    }

    if (addAnother) {
      setTimeout(() => {
        this.addTagSetUpAutocomplete();
        this.initializeAddTag();
      }, 100);
    }
  }

  delete(eventOrNoConfirm?: MouseEvent | boolean) {
    if (this.note.new) {
      // Deleting this note doesn't make sense, as it would immediately be replaced with another blank new note.
      return;
    }

    const noConfirm = (eventOrNoConfirm instanceof MouseEvent) ? eventOrNoConfirm.shiftKey : eventOrNoConfirm;

    this.note.delete(noConfirm);
  }

  newNoteWithSameTags() {
    if (this.activeUIs.home) {
      this.activeUIs.home.goToNewNoteWithSameTags(this.note);
    }
  }
}

