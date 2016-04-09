/*
 * Angular 2 decorators and services
 */
import {Component} from 'angular2/core';
import {RouteConfig, Router} from 'angular2/router';

import {Home} from './home';
import {AccountService, UserService, LoginComponent} from './account';
import {AnalyticsService} from './analytics.service';
import {AppState} from './app.service';
import {DataService} from './data.service';
import {Logger} from './utils/logger';
import {RouterActive} from './router-active';

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
  template: `
    <header>
      <nav>
        <h1>{{ name }}</h1>
        <ul>
          <li router-active>
            <a [routerLink]=" ['Home'] ">Home</a>
          </li>
          <li router-active>
            <a [routerLink]=" ['About'] ">About</a>
          </li>
        </ul>
      </nav>
    </header>

    <main>
      <login></login>
      <hr>
      <router-outlet></router-outlet>
    </main>

    <pre>this.state = {{ state | json }}</pre>
  `
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
    public appState: AppState,
    public userService: UserService,
    public accountService: AccountService,
    public dataService: DataService
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
