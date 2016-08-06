import {Component, EventEmitter, ElementRef, Input, Output, ViewChild} from '@angular/core';

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
  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  constructor(
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

  addTagFocus() {
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
    this.addTag(suggestion.value);

    if (event.shiftKey) {
      // Hold shift to open add tag field again
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
  closeAddTagField() {
    window.removeEventListener('click', this.closeAddTagFieldHandler);
    this.addingTag = false;
  }

  addTag(tagText = this.addTagName) {
    if (this.addingTag) {
      if (tagText === '') {
        this.closeAddTagField();
        return;
      }

      const tagAdded = this.note.addTagFromText(tagText);

      if (tagAdded) {
        this.addingTag = false;
        this.addTagName = '';
      }
    }
    else {
      this.addingTag = true;
      this.addTagInputRef.nativeElement.focus();
    }
  }
}
