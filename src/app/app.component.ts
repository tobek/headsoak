import {Component, ViewChild, ViewEncapsulation, HostBinding} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {SettingsService} from './settings/';
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
  styles: [ require('../assets/styles/_main.sass') ],
  template: require('./app.component.html')
})
export class App {
  name = 'nutmeg';

  routes: Route[] = routes;
  mainNavRoutes: Route[];
  menuNavRoutes: Route[];

  @HostBinding('class') hostClass = '';

  @ViewChild(LoginComponent) loginComponent: LoginComponent;
  @ViewChild(HomeComponent) homeComponent: HomeComponent;

  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private router: Router,
    public analyticsService: AnalyticsService,
    public settings: SettingsService,
    public dataService: DataService
   ) {
    this.mainNavRoutes = _.filter(this.routes, { data: { navSection: 'main' } });
    this.menuNavRoutes = _.filter(this.routes, { data: { navSection: 'menu' } });

    this.routerSub = router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe((event: NavigationEnd) => {
        const routeInfo = _.find(this.routes, { path: event.url.substring(1) });
        this.hostClass = 'route--' + routeInfo.data['slug'];
      });
  }

  ngOnInit() {
    this._logger.log('App component initializing');
  }
  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this._logger.log('App component destroyed!');
  }

  newNote(thenFocus = true): void {
    // @TODO/rewrite When on the Browse screen will have to slide over to Write
    this.homeComponent.goToNewNote();
  }

}
