import {Component, ViewChildren, QueryList} from '@angular/core';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account';
import {Note, NoteComponent, NoteBrowserComponent, NotesService} from '../notes/';


@Component({
  selector: 'home',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    NoteComponent,
    NoteBrowserComponent,
  ],
  styleUrls: [ './home.component.css' ],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  openNote: Note;
  newNote: Note;

  /** We only ever actually have one NoteCompont, but because that changes and we still need a reference to it, and because setTimeout doesn't seem to be sufficing, let's just use a QueryList so that we can subscribe to changes from it. */
  @ViewChildren(NoteComponent) noteComponents: QueryList<NoteComponent>;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public activeUIs: ActiveUIsService,
    public analyticsService: AnalyticsService,
    public notesService: NotesService,
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    // Wait for notes service to be ready and then initialize new note
    if (! _.isEmpty(this.notesService.notes)) {
      this.setUpNewNote();
    }
    else {
      let subscription = this.notesService.initialized$.subscribe(() => {
        this.setUpNewNote();
        subscription.unsubscribe();
      });
    }
  }

  setUpNewNote() {
    // This is a blank new note for the user to be able to use as soon as they open the app. We pass `init` true to `createNote` so that the note isn't saved to data store. As soon as they make anything that calls`note.update` (editing text, adding tag, sharing), it'll get saved to data store.

    if (! this.newNote || ! this.newNote.new){
      // Never made a new note, or made one and it's no longer new (was updated/edited) - either way create a new one:
      this._logger.log('Setting up new unsaved note');
      this.newNote = this.notesService.createNote({}, true);
      this.newNote.new = true;
    }

    this.noteOpened(this.newNote);
  }

  noteOpened(note: Note) {
    const sub = this.noteComponents.changes.subscribe(() => {
      sub.unsubscribe();
      this.activeUIs.openNoteComponent = this.noteComponents.first;
    });

    this.openNote = note;
  }

  noteClosed() {
    this.openNote = null;

    if (this.activeUIs.openNoteComponent === this.noteComponents.first) {
      this.activeUIs.openNoteComponent = null;
    }

    this.setUpNewNote();
  }

}
