import {Component, ViewChild, ViewEncapsulation, HostBinding, ChangeDetectorRef, ElementRef} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {AccountService} from './account/account.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {SettingsService} from './settings/settings.service';
import {Logger, SizeMonitorService, TooltipService} from './utils/';

import {ROUTES, NOTE_BROWSER_ROUTES, routingInfo} from './app.routes';

import {HomeComponent} from './home';
import {NoteQueryComponent} from './notes/';

import * as _ from 'lodash';

/*
 * App Component
 * Top Level Component
 */
@Component({
  selector: 'app',
  providers: [ ],
  encapsulation: ViewEncapsulation.None,
  template: require('./app.component.html')
})
export class App {
  NOTE_BROWSER_ROUTES = NOTE_BROWSER_ROUTES; // make available to template
  routes: Route[] = ROUTES;
  noteToggleNavRoutes: Route[];
  menuNavSettingsRoutes: Route[];
  routingInfo = routingInfo;

  /** Used to make on-hover menu go away when clicking on a menu item. */
  forceMenuClosed = false;

  isNoteQueryVisible = false;

  /** Whether we are on a route such that we should show the back button. */
  isBackable = false;

  initialized = false;

  @ViewChild('appWrapperRef') appWrapperRef: ElementRef;
  @ViewChild(HomeComponent) homeComponent: HomeComponent;
  @ViewChild(NoteQueryComponent) noteQueryComponent: NoteQueryComponent;

  private initializiationSub: Subscription;
  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private activeUIs: ActiveUIsService,
    private modalService: ModalService,
    private sizeMonitorService: SizeMonitorService,
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
      this.isBackable = false;

      this.routingInfo.lastNoteRoute = event.url;
    }
    else {
      this.isBackable = true;

      if (this.modalService.activeModal === 'note') {
        this.modalService.close();
      }
    }

    this.setRouteClass(event);
  }

  /** Sets class on app wrapper element to reflect current route. @NOTE Right now only supporting "root" routes e.g. /home or /tags. This is because if we get a route like `/tags/199` it's less trivial to match that to the `/tags/:tagId` route, so we'll just match it  to `/tags`. */
  setRouteClass(event: NavigationEnd): void {
    const path = event.url.substring(1).split('/')[0];
    const routeInfo = _.find(this.routes, { path: path });

    const className = this.appWrapperRef.nativeElement.className;

    // We don't want to add the class to the host element because it would be nice for the modal to be independent of route classes. So we'll add it to app wrapper, which has various classes bound to variables already, so we have to play nicely with them:

    if (className.indexOf('route--') === -1) {
      this.appWrapperRef.nativeElement.className += ' route--' + routeInfo.data['slug'];
    }
    else {
      this.appWrapperRef.nativeElement.className = className
        .replace(/route--[^ $]*/, 'route--' + routeInfo.data['slug']);
    }
  }

  // @TODO/ece Should this maybe do the same thing as back button?
  logoClick(): void {
    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.clearAndEnsureRoute();
    }
    else {
      this.router.navigateByUrl(this.routingInfo.lastNoteRoute);
    }
  }

  // @TODO/refactor This is nasty and requires in-depth knowledge about how parts of the app structure their routes. Ideally this could be baked into either the components running the navigation, OR we just store a `parent` path in each route in app routes data. However, it seems impossible to get data from the current route unless you're injecting `ActivatedRoute` *into the component being used for the route*.
  backClick(): void {
    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) !== -1) {
      return;
    }

    const pathParts = this.router.url.split('/');
    // Since routes start with '/', first element will be ''

    if (pathParts.length === 1) {
      return;
    }

    if (pathParts[1] === 'settings') {
      this.router.navigateByUrl(this.routingInfo.lastNoteRoute);
      return;
    }

    if (pathParts[1] === 'tags') {
      if (pathParts.length === 2) { // just '/tags'
        this.router.navigateByUrl(this.routingInfo.lastNoteRoute);
      }
      else {
        if (pathParts[2] === 'tag') { // details for specific tag
          if (pathParts.length === 5) { // e.g. '/tags/tag/<id>/<name>'
            this.router.navigateByUrl('/tags');
          }
          else { // e.g. '/tags/tag/<id>/<name>/smartness' - go up a level
            // pathParts.pop();
            // this.router.navigateByUrl(pathParts.join('/'));
            // ACTUALLY Since the "root" tag details page doesn't have any navigation, and you have to go up to tag browser to navigate, we should just pop them back there.
            // @TODO/mobile @TODO/polish @TODO/route We should probably scroll them to the expanded tag dropdown
            this.router.navigateByUrl('/tags');
          }
        }
        else {
          // some other tag page
          this.router.navigateByUrl('/tags');
        }
      }

      return;
    }

    this._logger.error('Unhandled route:', this.router.url);
    this.router.navigateByUrl(this.routingInfo.lastNoteRoute);
  }

  // @TODO/mobile @TODO/polish @TODO/ece Right now you can close the search bar even while there's something being searched for. Auto-clearing the search when closing it seems draconic, but the way it is there's no indication you're searching for something, could be surprising. I think the magnifier glass should be highlighted if a) there's a search query, and b) the search query is closed.
  searchModeClick(): void {
    this.isNoteQueryVisible = ! this.isNoteQueryVisible;
    setTimeout(() => {
      this.noteQueryComponent.focus();
    }, 0);
  }

  newNote(): void {
    // @HACK: Make this work on all routes by hijacking the shortcut for this, which includes `routeTo` logic to make sure we're in the right place.
    this.settings.data['sNewNote']['_fn']();
  }

  tagNavClick(): void {
    if (this.sizeMonitorService.isMobile) {
      this.router.navigateByUrl('/tags');
      return;
    }

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
