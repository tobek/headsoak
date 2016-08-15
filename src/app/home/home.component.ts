import {Component, ViewChild, QueryList} from '@angular/core';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {SettingsService} from '../settings/settings.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account';
import {Note, NoteComponent, NoteBrowserComponent, NotesService} from '../notes/';
import {Tag, TagsService} from '../tags/';


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
  private queryTagsUpdatedSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public activeUIs: ActiveUIsService,
    public analyticsService: AnalyticsService,
    public notesService: NotesService,
    public tagsService: TagsService,
    public dataService: DataService,
    public settings: SettingsService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire. Either way, will unsubscribe immediately after.
    this.notesService.initialized$.first().subscribe(this.init.bind(this));
  }

  ngOnDestroy() {
    this.noteUpdatedSub.unsubscribe();
    this.queryTagsUpdatedSub.unsubscribe();

    if (this.activeUIs.home === this) {
      this.activeUIs.home = null;
    }

    if (this.activeUIs.openNoteComponent === this.noteComponent) {
      this.activeUIs.openNoteComponent = null;
    }
  }

  init(): void {
    this.noteUpdatedSub = this.notesService.noteUpdated$.subscribe(this.noteUpdated.bind(this));

    this.setUpNewNote();

    this.activeUIs.home = this;
    this.activeUIs.openNoteComponent = this.noteComponent;

    this.activeUIs.noteBrowser$.first().subscribe((noteBrowser: NoteBrowserComponent) => {
      this.queryTagsUpdatedSub = noteBrowser.queryTagsUpdated$.subscribe(
        this.setUpNewNoteTags.bind(this)
       );
    });
  }

  setUpNewNote(): void {
    // This is a blank new note for the user to be able to use as soon as they open the app. We pass `init` true to `createNote` so that the note isn't saved to data store. As soon as they make anything that calls`note.update` (editing text, adding tag, sharing), it'll get saved to data store.

    if (! this.newNote || ! this.newNote.new){
      // Never made a new note, or made one and it's no longer new (was updated/edited) - either way create a new one:
      this._logger.log('Setting up new unsaved note');
      this.newNote = this.notesService.createNote({}, true);
      this.newNote.new = true;
      this.setUpNewNoteTags();
    }

    this.noteOpened(this.newNote);
  }

  setUpNewNoteTags(): void {
    if (! this.newNote.new) {
      // They've edited this note - body or tags - so don't modify the tags futher, regardless of what happens in the query. @TODO/ece This sound right?
      return;
    }

    if (! this.settings.get('addQueryTagsToNewNuts')) {
      this.newNote.tags = [];
      return;
    }

    if (this.activeUIs.noteBrowser) {
      this.newNote.tags = this.activeUIs.noteBrowser.queryTags.map((tag: Tag) => tag.id);
    }
  }

  noteOpened(note: Note): void {
    this.openNote = note;

    this.noteComponent.bodyFocus();
  }

  closeNote(): void {
    this.openNote = null;

    this.setUpNewNote();
  }

  noteUpdated(note: Note): void {
    if (note.deleted && this.openNote === note) {
      this.closeNote();
    }
  }

  goToNewNote(thenFocus = true): void {
    if (! this.openNote.new) {
      // We have a note open that is not new - it has changes/content
      this.closeNote(); // will set up a new note
    }

    // Now we have an untouched new note open
    if (thenFocus) {
      this.noteComponent.bodyFocus();
    }
  }

  goToNewNoteAddTag(): void {
    this.goToNewNote(false);
    this.noteComponent.initializeAddTag();
    // this.noteComponent.cdrRef.detectChanges(); // this was necessary when new note happened in/from note browser but no longer seems necessary, but keeping it here for reference.
  }

  goToNewNoteWithSameTags(note: Note): void {
    this.goToNewNote();
    
    this.newNote.tags = note.tags.filter((tagId: string) => {
      const tag = this.tagsService.tags[tagId];
      return ! tag.prog && ! tag.readOnly;
    });
  }

}
