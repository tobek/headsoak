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
}
