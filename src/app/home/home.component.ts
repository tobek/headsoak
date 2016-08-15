import {Component, ViewChild, QueryList} from '@angular/core';
import {Subscription} from 'rxjs';

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

  @ViewChild(NoteComponent) noteComponent: NoteComponent;

  private noteUpdatedSub: Subscription;

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
      this.init();
    }
    else {
      let subscription = this.notesService.initialized$.subscribe(() => {
        this.init();
        subscription.unsubscribe();
      });
    }
  }

  ngOnDestroy() {
    this.noteUpdatedSub.unsubscribe();

    if (this.activeUIs.home === this) {
      this.activeUIs.home = null;
    }

    if (this.activeUIs.openNoteComponent === this.noteComponent) {
      this.activeUIs.openNoteComponent = null;
    }
  }

  init() {
    this.noteUpdatedSub = this.notesService.noteUpdated$.subscribe(this.noteUpdated.bind(this));

    this.setUpNewNote();

    this.activeUIs.home = this;
    this.activeUIs.openNoteComponent = this.noteComponent;
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
    this.openNote = note;
  }

  closeNote() {
    this.openNote = null;

    this.setUpNewNote();
  }

  noteUpdated(note: Note) {
    if (note.deleted && this.openNote === note) {
      this.closeNote();
    }
  }

  goToNewNote(thenFocus = true) {
    if (! this.openNote.new) {
      // We have a note open that is not new - it has changes/content
      this.closeNote(); // will set up a new note
    }

    // Now we have an untouched new note open
    if (thenFocus) {
      this.noteComponent.bodyFocus();
    }
  }

  goToNewNoteAddTag() {
    this.goToNewNote(false);
    this.noteComponent.initializeAddTag();
    // this.noteComponent.cdrRef.detectChanges(); // this was necessary when new note happened in/from note browser but no longer seems necessary, but keeping it here for reference.
  }

}
