/*
 * Angular 2 decorators and services
 */
import {Component} from 'angular2/core';
import {RouteConfig, Router} from 'angular2/router';

import {RouterActive} from './router-active';
import {AppState} from './app.service';
import {AnalyticsService} from './analytics.service';
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
    RouterActive,
    LoginComponent,
    NoteListComponent,
  ],
  styles: [`
    h1 {
      font-family: Arial, Helvetica, sans-serif
    }
    nav ul {
      display: inline;
      list-style-type: none;
      margin: 0;
      padding: 0;
      width: 60px;
    }
    nav li {
      display: inline;
    }
    nav li.active {
      background-color: lightgray;
    }
  `],
  template: require('./app.component.html')
})
@RouteConfig([
  { path: '/',      name: 'Home', component: Home, useAsDefault: true },
  // Async load a component using Webpack's require with es6-promise-loader and webpack `require`
  { path: '/about', name: 'About', loader: () => require('es6-promise!./about')('About') },
])
export class App {
  name = 'nutmeg';

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
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
