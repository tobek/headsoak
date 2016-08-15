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
  styles: [ require('./note.component.css') ],
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
    if (this.activeUIs.noteBrowser) {
      this.activeUIs.noteBrowser.queryTagToggled(tagId, event && event.shiftKey);
    }
  }

  bodyFocus() {
    this.bodyInputRef.nativeElement.focus();
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

    const addAnotherTag = event.shiftKey;

    this.completeAddTag(suggestion.value, ! addAnotherTag);

    if (addAnotherTag) {
      setTimeout(() => {
        this.addTagSetUpAutocomplete();
        this.initializeAddTag();
      }, 100);
    }
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

    if (focusOnBody) {
      this.bodyFocus();
    }
  }

  initializeAddTag(tagText = this.addTagName, focusOnBody = true) {
    this.addingTag = true;
    this.addTagInputRef.nativeElement.focus();
  }

  completeAddTag(tagText = this.addTagName, focusOnBody = true) {
    if (tagText === '') {
      this.closeAddTagField(focusOnBody);

      return;
    }

    const tagAdded = this.note.addTagFromText(tagText);

    if (tagAdded) {
      this.addTagName = '';

      this.closeAddTagField(focusOnBody);
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
    if (this.activeUIs.noteBrowser) {
      this.activeUIs.noteBrowser.newNoteWithSameTags(this.note);
    }
  }
}

