import {Component, Input} from 'angular2/core';

import {AnalyticsService} from '../analytics.service';
import {Note} from '../notes/note.model';
import {NoteComponent} from '../notes/note.component';
import {NotesService} from '../notes/notes.service';

@Component({
  selector: 'note-list',
  pipes: [],
  directives: [
    NoteComponent,
  ],
  styles: [require('./note-list.component.css')],
  template: require('./note-list.component.html')
})
export class NoteListComponent {
  @Input() notes: Array<Note>;

  constructor(
    private analyticsService: AnalyticsService,
    private notesService: NotesService
  ) { }

  ngOnInit() {
  }

}
