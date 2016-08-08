/*
 * Angular 2 decorators and services
 */
import { Component, ViewEncapsulation } from '@angular/core';

import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {Logger} from './utils/logger';

import {Home} from './home';
import {LoginComponent} from './account';
import {NoteBrowserComponent} from './notes/';
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
    NoteBrowserComponent,
    TagBrowserComponent,
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
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('App component initializing');
  }
  ngOnDestroy() {
    this._logger.log('App component destroyed!');
  }

}
