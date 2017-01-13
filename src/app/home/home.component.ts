import {Component, ViewChild, HostBinding} from '@angular/core';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {SettingsService} from '../settings/settings.service';
import {Logger} from '../utils/logger';

import {Note, NoteComponent, NotesService} from '../notes/';
import {Tag, TagsService} from '../tags/';


@Component({
  selector: 'home',
  providers: [ ],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  // @REMOVED/write
  // openNote: Note;

  // @REMOVED/write
  // @ViewChild(NoteComponent) noteComponent: NoteComponent;

  @HostBinding('class.is--tag-browser-collapsed') tagBrowserCollapsed = false

  // @REMOVED/write
  // private noteUpdatedSub: Subscription;
  private queryTagsUpdatedSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private router: Router,
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
    // @REMOVED/write
    // this.noteUpdatedSub.unsubscribe();

    this.queryTagsUpdatedSub.unsubscribe();

    if (this.activeUIs.home === this) {
      this.activeUIs.home = null;
    }

    // @REMOVED/write
    // if (this.activeUIs.openNoteComponent === this.noteComponent) {
    //   this.activeUIs.openNoteComponent = null;
    // }
  }

  init(): void {
    // @REMOVED/write
    // this.noteUpdatedSub = this.notesService.noteUpdated$.subscribe(this.noteUpdated.bind(this));

    // @REMOVED/write
    // this.activeUIs.openNoteComponent = this.noteComponent;
  }

  // @REMOVED/write
  // noteOpened(note: Note, thenFocus = true): void {
  //   this.openNote = note;

  //   if (thenFocus) {
  //     this.noteComponent.bodyFocus();
  //   }

  //   setTimeout(this.noteComponent.checkTagOverflow.bind(this.noteComponent));
  // }

  // @REMOVED/write
  // closeNote(thenFocus = true): void {
  //   this.openNote = null;

  //   this.setUpNewNote(thenFocus);

  //   setTimeout(this.noteComponent.checkTagOverflow.bind(this.noteComponent));
  // }

  noteUpdated(note: Note): void {
    // @REMOVED/write
    // if (note.deleted && this.openNote === note) {
    //   this.closeNote();
    // }
  }

  goToNewNote(thenFocus = true): void {
    // @REMOVED/write
    // if (! this.openNote.new) {
    //   // We have a note open that is not new - it has changes/content
    //   this.closeNote(); // will set up a new note
    // }
    // else if (this.openNote.new && this.openNote.body) {
    //   // We have a note open that has yet to be saved. Blur it (which will save, set oldBody, etc.), then close it, ready for a truly new note.
    //   this.openNote.blurred();
    //   this.closeNote();
    // }

    // // Now we have an untouched new note open
    // if (thenFocus) {
    //   this.noteComponent.bodyFocus();
    // }
  }

  goToNewNoteAddTag(): void {
    // @REMOVED/write
    // this.goToNewNote(false);
    // this.noteComponent.initializeAddTag();

    // this.noteComponent.cdrRef.detectChanges(); // this was necessary when new note happened in/from note browser but no longer seems necessary, but keeping it here for reference.
  }

  goToNewNoteWithSameTags(note: Note): void {
    // @REMOVED/write
    
    // this.goToNewNote();
    
    // this.newNote.tags = note.tags.filter((tagId: string) => {
    //   const tag = this.tagsService.tags[tagId];
    //   return ! tag.prog && ! tag.readOnly;
    // });
  }
}
