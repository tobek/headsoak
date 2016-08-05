/*
 * Angular 2 decorators and services
 */
import { Component, ViewEncapsulation } from '@angular/core';

import {AppState} from './app.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {Logger} from './utils/logger';

import {Home} from './home';
import {LoginComponent} from './account';
import {NoteListComponent} from './notes/';

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    NoteListComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  styles: [ require('./app.component.css') ],
  template: require('./app.component.html')
})
export class App {
  name = 'nutmeg';

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService,
    public appState: AppState
   ) {}

  get state() {
    return this.appState.get();
  }

  ngOnInit() {
    this._logger.log('Initial State', this.state);
  }
  ngOnDestroy() {
    this._logger.log('component destroyed!');
  }

}
