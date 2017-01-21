import {Component, ViewChild, ViewEncapsulation, HostBinding, ChangeDetectorRef} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {TooltipService} from './utils/tooltip.service';
import {AccountService} from './account/account.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {SettingsService} from './settings/settings.service';
import {Logger} from './utils/logger';

import {ROUTES, NOTE_BROWSER_ROUTES} from './app.routes';

import {HomeComponent} from './home';

import * as _ from 'lodash';

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  providers: [ ],
  encapsulation: ViewEncapsulation.None,
  styles: [
    require('../assets/styles/_main.sass'),
  ],
  template: require('./app.component.html')
})
export class App {
  NOTE_BROWSER_ROUTES = NOTE_BROWSER_ROUTES; // make available to template
  routes: Route[] = ROUTES;
  noteToggleNavRoutes: Route[];
  menuNavSettingsRoutes: Route[];
  closeMenu = false;

  /** The most recently-visited note-related route. */
  lastNoteRoute = '/';

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
    this.noteToggleNavRoutes = _.filter(
      this.routes,
      { data: { navSection: 'note-toggle' } }
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
      .subscribe(this.routeUpdated.bind(this));
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
        if (this.accountService.loggedInWithTemporaryPassword) {
          this.modalService.alert(
            'You have logged in with a temporary password that is only valid for 24 hours. Please change your password now.',
            undefined,
            'Got it',
            () => {
              this.router.navigateByUrl('/settings/account');
            }
          );
          // @TODO/polish The transition from loading/login screen to `modalService.close` looks nice, but transitioning to alert not so much. We could either handle it specially, or once queuing up modals works we could maybe call the alert right after closing.
        }
        else {
          this.modalService.close();
        }
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

  routeUpdated(event: NavigationEnd) {
    if (NOTE_BROWSER_ROUTES.indexOf(event.url) !== -1) {
      this.lastNoteRoute = event.url;
    }

    this.setRouteClass(event);
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

  tagNavClick(): void {
    // @TODO/polish @TODO/tags Would be cool if on tags pages it also collapsed the tag browser - this would let you go full screen on things like the visualizations, and also smart tag creation page (allowing for documentation in the sidebar?) On the other hand, maybe an explicit "full screen" link in those places would be better (it could do the same thing though.)

    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) !== -1) {
      this.homeComponent.tagBrowserCollapsed = ! this.homeComponent.tagBrowserCollapsed;
    }
    else if (this.router.url === '/tags') {
      // Base tags page, do nothing, just stay here
    }
    else {
      this.router.navigateByUrl('/tags');
    }
  }

}
