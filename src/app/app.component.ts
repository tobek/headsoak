import {Component, ViewChild, ViewEncapsulation, HostBinding, ChangeDetectorRef, ElementRef, NgZone} from '@angular/core';
import {Route, Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {AccountService} from './account/account.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {SettingsService} from './settings/settings.service';
import {Logger, SizeMonitorService, ScrollMonitorService, TooltipService} from './utils/';

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
  templateUrl: './app.component.html'
})
export class AppComponent {
  NOTE_BROWSER_ROUTES = NOTE_BROWSER_ROUTES; // make available to template
  routes: Route[] = ROUTES;
  noteToggleNavRoutes: Route[];
  menuNavSettingsRoutes: Route[];
  routingInfo = routingInfo;

  /** Used to make on-hover menu go away when clicking on a menu item. */
  forceMenuClosed = false;

  isNoteQueryVisible = false;
  isHeaderless = false;

  /** Whether we are on a route such that we should show the back button. */
  isBackable = false;

  isNoteViewsNavOpen = false;

  initialized = false;

  @ViewChild('appWrapperRef') appWrapperRef: ElementRef;
  @ViewChild(HomeComponent) homeComponent: HomeComponent;
  @ViewChild(NoteQueryComponent) noteQueryComponent: NoteQueryComponent;
  @ViewChild('notesNav') notesNav: ElementRef;

  private subscriptions: Subscription[] = [];
  private initializiationSub: Subscription;
  private routerSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public sizeMonitor: SizeMonitorService,
    public router: Router,
    public changeDetector: ChangeDetectorRef,
    public accountService: AccountService,
    public analyticsService: AnalyticsService,
    public modalService: ModalService,
    public settings: SettingsService,
    public dataService: DataService,
    private zone: NgZone,
    private activeUIs: ActiveUIsService,
    private scrollMonitor: ScrollMonitorService,
    private tooltipService: TooltipService
   ) {
    this.zone.onError.subscribe((err) => {
      window['hsErrorReportVal']('zoneErr', err);
    });

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

    this.subscriptions.push(this.dataService.initialized$.subscribe(this.appInitialization.bind(this)));

    this.subscriptions.push(router.events
      .filter((event) => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this)));

    this.subscriptions.push(this.scrollMonitor.scroll$.subscribe(this.onScroll.bind(this)));
  }

  ngOnInit() {
    this._logger.log('App component initializing');

    // @HACK Passing change detector through the app is annoying but it can't be added to a Service and DataService needs to call it, so...
    this.accountService.init(this.changeDetector);

    this.scrollMonitor.init();

    // sorry
    if (/iPad|iPhone|iPod/.test(navigator.userAgent) && ! window['MSStream']) {
      document.documentElement.classList.add('is--ios');
    }
  }
  ngOnDestroy() {
    for (let sub of this.subscriptions) {
      sub.unsubscribe();
    }

    this._logger.log('App component destroyed!');
  }

  appInitialization(isInitialized: boolean): void {
    if (isInitialized) {
      // Wait a little while before we actually init or else the MutationObserver will freak out (Firefox hangs actually if you init this too early on) as everything loads.
      setTimeout(() => {
        this.tooltipService.init();
      }, 2000);

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
          // @TODO/polish The transition from loading/login screen to `modalService.close` looks nice, but transitioning to alert not so much. We could either handle it specially, or once queuing up modals works we could maybe call the alert right after closing. @TODO/modals I guess we can use `modal2` now!
        }
        else {
          this.modalService.close();
        }

        // @HACK Our angular select dropdown library has a field to type in what you want to select. You shouldn't be able to tab to it.
        const noTabPlease = document.querySelectorAll('ng-select [tabindex="0"]');
        for (let noTab of (noTabPlease as any as HTMLElement[])) {
          noTab.setAttribute('tabindex', '-1');
        }
      }, 0);
    }
    else {
      // Just look for tooltips in homepage component (which uh happens to be in modal). And wait a sec cause stuff will still be loading.
      setTimeout(() => {
        this.tooltipService.init(document.querySelector('modal'));
      }, 2000);
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

      if (this.routingInfo.previousRoute && NOTE_BROWSER_ROUTES.indexOf(this.routingInfo.previousRoute) === -1) {
        this.scrollMonitor.scrollToTop(0);
      }
    }
    else {
      this.isBackable = true;

      if (this.modalService.activeModal === 'note') {
        this.modalService.close();
      }
    }

    this.isHeaderless = false;

    this.setRouteClass(event);

    this.routingInfo.previousRoute = event.url;
  }

  /** Sets class on app wrapper element to reflect current route. @NOTE Right now only supporting "root" routes e.g. /home or /tags. This is because if we get a route like `/tags/199` it's less trivial to match that to the `/tags/:tagId` route, so we'll just match it  to `/tags`. */
  setRouteClass(event: NavigationEnd): void {
    const path = event.url.substring(1).split('/')[0];
    const routeInfo = _.find(this.routes, { path: path });

    // We don't want to add the class to the host element because it would be nice for the modal to be independent of route classes. So we'll add it to app wrapper, which has various classes bound to variables already, so we have to play nicely with them:

    let className = this.appWrapperRef.nativeElement.className;

    className = className.replace(/route--[^ $]*/g, '');

    className += ' route--' + routeInfo.data['slug'];

    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) !== -1) {
      className += ' route--note-route';
    }

    this.appWrapperRef.nativeElement.className = className;
  }

  logoClick(): void {
    if (this.sizeMonitor.isMobile && this.isBackable) {
      this.backClick();
      return;
    }

    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.clearAndEnsureRoute();

      if (this.isNoteQueryVisible) {
        this.isNoteQueryVisible = false;
      }
    }
    else {
      this.router.navigateByUrl(this.routingInfo.lastNoteRoute);
    }
  }

  // @TODO/refactor This is nasty and requires in-depth knowledge about how parts of the app structure their routes. Ideally this could be baked into either the components running the navigation, OR we just store a `parent` path in each route in app routes data. However, it seems impossible to get data from the current route unless you're injecting `ActivatedRoute` *into the component being used for the route*.
  backClick(): void {
    if (! this.isBackable || NOTE_BROWSER_ROUTES.indexOf(this.router.url) !== -1) {
      this._logger.warn('Unexpected call to `backClick` when `isBackable` is false or we\'re on a note route. How did we get here? Route:', this.router.url);
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
    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) === -1) {
      this.router.navigateByUrl(this.routingInfo.lastNoteRoute);

      if (this.isNoteQueryVisible) {
        // Don't close it - bring them back to it and show it to them
        return;
      }
    }

    this.isNoteQueryVisible = ! this.isNoteQueryVisible;

    if (this.isNoteQueryVisible) {
      setTimeout(() => {
        this.noteQueryComponent.focus();
      }, 0);
    }
  }

  setSearchModeVisiblity(visible: boolean) {
    if (! visible) {
      this.isHeaderless = false;
    }

    this.isNoteQueryVisible = visible;
  }

  newNote(): void {
    // @HACK: Make this work on all routes by hijacking the shortcut for this, which includes `routeTo` logic to make sure we're in the right place.
    this.settings.data['sNewNote']['_fn']();
  }

  noteNavTouchend(event: Event): void {
    if  (! this.sizeMonitor.isMobile) {
      return;
    }
    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) === -1) {
      // Let the routerLink directive take us back notes
      return;
    }

    this.isNoteViewsNavOpen = ! this.isNoteViewsNavOpen;

    // Don't set this up until next click otherwise we immediately unhover
    setTimeout(this.closeNoteNavOnNextTouch.bind(this), 0);

    event.preventDefault();
  }

  // @TODO/refactor Very similar code for tag dropdown in TagComponent - if we need this again, should share logic
  closeNoteNavOnNextTouch() {
    jQuery(window).one('touchend', this.noteNavOnNextTouch.bind(this));
  }
  noteNavOnNextTouch(event: Event) {
    if (this.isNoteViewsNavOpen && ! this.notesNav.nativeElement.contains(event.target)) {
      this.isNoteViewsNavOpen = false;
      event.stopImmediatePropagation();
      return false;
    }
    // Something else closed us, OR this was a click inside notes nav. Either way, let other handlers handle what to do next
  }

  tagNavClick(): void {
    if (this.sizeMonitor.isMobile) {
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

  onScroll(newScrollY: number) {
    if (! this.sizeMonitor.isMobile) {
      return;
    }

    if (newScrollY > 50 && newScrollY > this.scrollMonitor.lastScrollY) {
      // User scrolled down - and must be 50px or more down the page otherwise momentum scroll bounce fucks it up (I thinkthat's what's happening)
      this.isHeaderless = true;
    }
    else {
      this.isHeaderless = false;
    }
  }

}
