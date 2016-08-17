import { Component, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {Logger} from './utils/logger';

import {routes} from './';

import {HomeComponent} from './home';
import {LoginComponent} from './account';
import {NoteQueryComponent} from './notes';
import {TagBrowserComponent} from './tags/tag-browser.component'; // @NOTE No idea why, but adding this to `tags/index.ts` and importing from './tags/' makes angular unable to resolve TagBrowerComponent

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
    HomeComponent,
    NoteQueryComponent,
    TagBrowserComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  styles: [ require('./app.component.css') ],
  template: require('./app.component.html')
})
export class App {
  name = 'nutmeg';

  routes = routes;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('App component initializing');
  }
  ngOnDestroy() {
    this._logger.log('App component destroyed!');
  }

}
