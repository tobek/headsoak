import {Component, EventEmitter, Input, Output} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Note} from '../notes/note.model';
import {NotesService} from '../notes/notes.service';
import {TagComponent} from '../tags/tag.component';

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
  @Input() note: Note;
  @Output() tagToggled = new EventEmitter<Object>();

  constructor(
    private analyticsService: AnalyticsService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
  }

  toggleTag(tagId: string, event: MouseEvent) {
    this.tagToggled.emit({ tagId: tagId, shiftHeld: (event && event.shiftKey) });
  }
}
