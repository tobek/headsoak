import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Note} from '../notes/note.model';
import {NotesService} from '../notes/notes.service';
import {TagComponent} from '../tags/';

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
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  constructor(
    private analyticsService: AnalyticsService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
  }

  toggleTag(tagId: string, event: MouseEvent) {
    this.tagToggled.emit({ tagId: tagId, shiftHeld: (event && event.shiftKey) });
  }

  addTagFocus() {
    // We can't rely on blur to close the tag field because then clicking on add tag button also closes tag field.
    window.addEventListener('click', this.closeAddTagFieldHandler.bind(this));
  }

  closeAddTagFieldHandler(event: MouseEvent) {
    const clickedEl = <HTMLElement> event.target;
    if (clickedEl && clickedEl.classList.contains('new-tag-button')) {
      return;
    }

    this.closeAddTagField();
  }
  closeAddTagField() {
    window.removeEventListener('click', this.closeAddTagFieldHandler);
    this.addingTag = false;
  }

  addTag() {
    if (this.addingTag) {
      if (this.addTagName === '') {
        this.closeAddTagField();
        return;
      }

      const tagAdded = this.note.addTag(this.addTagName);

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
