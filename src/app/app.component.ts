import {Component, ViewChild, ViewEncapsulation, HostBinding, ChangeDetectorRef} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {TooltipService} from './utils/tooltip.service';
import {AccountService} from './account/account.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {SettingsService} from './settings/';
import {Logger} from './utils/logger';

import {routes} from './';

import {ModalComponent} from './modals/modal.component';
import {HomeComponent} from './home/';
import {NoteQueryComponent} from './notes/';
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
    ModalComponent,
    HomeComponent,
    NoteQueryComponent,
    TagBrowserComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  styles: [
    require('../assets/styles/_main.sass'),
  ],
  template: require('./app.component.html')
})
export class App {
  routes: Route[] = routes;
  mainNavRoutes: Route[];
  menuNavSettingsRoutes: Route[];

  initialized = false;
  @HostBinding('class') hostClass = '';

  @ViewChild(HomeComponent) homeComponent: HomeComponent;

  private initializiationSub: Subscription;
  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private activeUIs: ActiveUIsService,
    private modalService: ModalService,
    private tooltipService: TooltipService,
    private router: Router,
    public changeDetector: ChangeDetectorRef,
    public accountService: AccountService,
    public analyticsService: AnalyticsService,
    public settings: SettingsService,
    public dataService: DataService
   ) {
    this.mainNavRoutes = _.filter(
      this.routes,
      { data: { navSection: 'main' } }
    );
    this.menuNavSettingsRoutes = _.filter(
      _.find(
        this.routes,
        { path: 'settings' }
      )['children'],
      { data: { navSection: 'menu' } }
    );

    this.initializiationSub = this.dataService.initialized$.subscribe(this.appInitialization.bind(this));

    this.routerSub = router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(this.setRouteClass.bind(this));
  }

  ngOnInit() {
    this._logger.log('App component initializing');

    // @HACK Passing change detector through the app is annoying but it can't be added to a Service and DataService needs to call it, so...
    this.accountService.init(this.changeDetector);

    this.tooltipService.init();
  }
  ngOnDestroy() {
    this.initializiationSub.unsubscribe();
    this.routerSub.unsubscribe();
    this._logger.log('App component destroyed!');
  }

  appInitialization(isInitialized: boolean): void {
    if (isInitialized) {
      setTimeout(() => {
        this.modalService.close();
      }, 0);
    }

    const outerLoader = document.querySelector('.initial-loader.outer');
    if (outerLoader) {
      document.querySelector('body').classList.add('hide-loader');
      setTimeout(function() {
        // Probably not necesssary, but the .hide-loader class just does opacity and visibility in order for fade to work, and it seems like loader remains animated. Fuck it just get rid of it.
        outerLoader.remove();
      }, 5000);
    }

    this.initialized = isInitialized;
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
