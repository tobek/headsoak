import {Component, ViewChildren, QueryList} from '@angular/core';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account';
import {Note, NoteComponent, NoteBrowserComponent} from '../notes/';


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

  /** We only ever actually have one NoteCompont, but because that changes and we still need a reference to it, and because setTimeout doesn't seem to be sufficing, let's just use a QueryList so that we can subscribe to changes from it. */
  @ViewChildren(NoteComponent) noteComponents: QueryList<NoteComponent>;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public activeUIs: ActiveUIsService,
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');
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
  }

}
