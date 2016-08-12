import {Component} from '@angular/core';

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
  styleUrls: [],
  templateUrl: './home.component.html'
})
export class HomeComponent {
  openNote: Note;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');
  }

  noteOpened(note: Note) {
    this.openNote = note;
  }

  noteClosed() {
    this.openNote = null;
  }

}
