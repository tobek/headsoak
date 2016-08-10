import {Component, EventEmitter, ElementRef, Input, Output, ViewChild, ChangeDetectorRef} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
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
  @Output() tagToggled = new EventEmitter<Object>();
  @Output() deleted= new EventEmitter<Note>();
  @Output() newWithSameTags = new EventEmitter<Note>();
  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  constructor(
    public cdrRef: ChangeDetectorRef,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
  }

  toggleTag(tagId: string, event: MouseEvent) {
    this.tagToggled.emit({ tagId: tagId, shiftHeld: (event && event.shiftKey) });
  }

  focus() {
    this.bodyInputRef.nativeElement.focus();
  }

  addTagFocused() {
    // We can't rely on blur to close the tag field because then clicking on add tag button also closes tag field.
    window.removeEventListener('click', this.closeAddTagFieldHandler);
    window.addEventListener('click', this.closeAddTagFieldHandler.bind(this));

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
    const addAnotherTag = event.shiftKey;

    this.addTag(suggestion.value, ! addAnotherTag);

    if (addAnotherTag) {
      setTimeout(() => {
        this.addTagSetUpAutocomplete();
        this.addTag();
      }, 100);
    }
  }

  closeAddTagFieldHandler(event: MouseEvent) {
    const clickedEl = <HTMLElement> event.target;
    if (clickedEl && clickedEl.classList.contains('new-tag-button')) {
      return;
    }
    else if (document.querySelector('.autocomplete-suggestions').contains(clickedEl)) {
      return;
    }

    this.closeAddTagField();
  }
  closeAddTagField(focusOnBody = false) {
    window.removeEventListener('click', this.closeAddTagFieldHandler);
    this.addingTag = false;

    if (focusOnBody) {
      this.focus();
    }
  }

  addTag(tagText = this.addTagName, focusOnBody = true) {
    if (this.addingTag) {
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
    else {
      this.addingTag = true;
      this.addTagInputRef.nativeElement.focus();
    }
  }

  delete(event: MouseEvent) {
    let noConfirm = event.shiftKey;
    if (this.note.delete(noConfirm)) {
      this.deleted.emit(this.note);
    }
  }

  newNoteWithSameTags() {
    this.newWithSameTags.emit(this.note);
  }
}
