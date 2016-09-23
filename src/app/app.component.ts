import {Component, ViewChild, ViewEncapsulation, HostBinding} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from './active-uis.service';
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
  routes: Route[] = routes;
  mainNavRoutes: Route[];
  menuNavRoutes: Route[];

  @HostBinding('class') hostClass = '';

  @ViewChild(LoginComponent) loginComponent: LoginComponent;
  @ViewChild(HomeComponent) homeComponent: HomeComponent;

  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private activeUIs: ActiveUIsService,
    private router: Router,
    public analyticsService: AnalyticsService,
    public settings: SettingsService,
    public dataService: DataService
   ) {
    this.mainNavRoutes = _.filter(this.routes, { data: { navSection: 'main' } });
    this.menuNavRoutes = _.filter(this.routes, { data: { navSection: 'menu' } });

    this.routerSub = router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(this.setRouteClass.bind(this));
  }

  ngOnInit() {
    this._logger.log('App component initializing');
  }
  ngOnDestroy() {
    this.routerSub.unsubscribe();
    this._logger.log('App component destroyed!');
  }

  /** Sets class on component host element to reflect current route. @NOTE Right now only supporting "root" routes e.g. /home or /tags. This is because if we get a route like `/tags/199` it's less trivial to match that to the `/tags/:tagId` route, so we'll just match it  to `/tags`. */
  setRouteClass(event: NavigationEnd): void {
    const path = event.url.substring(1).split('/')[0];
    const routeInfo = _.find(this.routes, { path: path });
    this.hostClass = 'route--' + routeInfo.data['slug'];
  }

  logoClick(): void {
    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.clearAndEnsureRoute();
    }
    else {
      this.router.navigateByUrl('/');
    }
  }

  newNote(thenFocus = true): void {
    // @HACK: Make this work on all routes by hijacking the shortcut for this, which includes `routeTo` logic to make sure we're in the right place.
    this.settings.data['sNewNote']['_fn']();
  }

}
