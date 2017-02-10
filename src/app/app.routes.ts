import {Component, Injectable} from '@angular/core';
import {Routes/*, CanDeactivate */} from '@angular/router';
import {SettingsComponent} from './settings';
import {NoContentComponent} from './no-content';
import {EmptyComponent} from './utils';
// import {ModalService} from './modals/modal.service';


/** Routes which contain NoteBrowserComponent. */
export const NOTE_BROWSER_ROUTES = [
  '/',
  // '/write',
  // '/focus',
  '/browse',
  '/list',
];
export const DEFAULT_NOTE_ROUTE = '/';

export const routingInfo = {
  /** The most recently-visited note-related route. */
  lastNoteRoute: DEFAULT_NOTE_ROUTE,
};

export const ROUTES: Routes = [
  {
    // @TODO/rewrite This should be hidden on mobile
    path: 'focus',
    data: {
      name: 'Focus',
      slug: 'focus',
      // navSection: 'note-toggle', // @TODO/rewrite Hidden entirely for now - we'll support it from elsewhere? Menu or as a note action?
      iconSlug: 'square',
    },
    component: EmptyComponent
  },
  {
    path: 'write',
    data: {
      name: 'Write',
      slug: 'write',
      // navSection: 'note-toggle', // @REMOVED/write Hidden for now and probably forever except as an overkill option perhaps (could be good with a single-line-list version of browser)
      // iconSlug: 'th-large',
      iconSlug: 'columns',
    },
    component: EmptyComponent
  },
  {
    path: '',
    data: {
      name: 'Scroll',
      slug: 'scroll',
      navSection: 'note-toggle',
      iconSlug: 'bars',
    },
    component: EmptyComponent
  },
  {
    path: 'browse',
    data: {
      name: 'Browse',
      slug: 'browse',
      navSection: 'note-toggle',
      iconSlug: 'th',
    },
    component: EmptyComponent
  },
  {
    path: 'list',
    data: {
      name: 'List',
      slug: 'list',
      navSection: 'note-toggle',
      iconSlug: 'list',
    },
    component: EmptyComponent
  },
  {
    path: 'tags',
    data: {
      name: 'Tags',
      slug: 'tags',
      // navSection: 'main', // removed from here since we have a toggle not a normal route in our main nav
      iconSlug: 'hashtag',
    },
    component: EmptyComponent,

    children: [
      {
        path: '',
        component: EmptyComponent
      },
      {
        // Only used on mobile - on desktop we show explore visualization in the base `/tags` page
        path: 'explore',
        component: EmptyComponent
      },
      {
        path: 'smart-tags',
        component: EmptyComponent,
        children: [
          {
            path: 'library',
            component: EmptyComponent,
          }
        ]
      },
      {
        path: 'tag/:tagId/:tagName',
        component: EmptyComponent,
        children: [
          {
            path: '',
            component: EmptyComponent
          },
          {
            // @TODO/polish @TODO/prog We should have a guard here to prevent/confirm navigation if they've changed prog tag code but haven't saved/run it
            path: ':section',
            component: EmptyComponent
          },
        ]
      },
    ]
  },

  {
    path: 'settings',
    component: EmptyComponent,
    data: {
      slug: 'settings'
    },
    children: [
      {
        path: 'account',
        data: {
          name: 'Account',
          slug: 'account',
          navSection: 'menu',
          iconSlug: 'smile-o',
        },
        component: SettingsComponent
      },
      {
        path: '',
        data: {
          name: 'Settings',
          slug: 'settings',
          navSection: 'menu',
          iconSlug: 'sliders',
        },
        component: SettingsComponent
      },
      {
        path: 'shortcuts',
        data: {
          name: 'Shortcuts',
          slug: 'shortcuts',
          navSection: 'menu',
          iconSlug: 'fighter-jet',
        },
        component: SettingsComponent
      },
      {
        path: 'feedback',
        data: {
          name: 'Feedback',
          slug: 'feedback',
          // navSection: 'menu', // In the nav menu we activate the feedback modal rather than go to feedback in settings screen
          iconSlug: 'comment-o',
        },
        component: SettingsComponent
      },
      {
        path: 'private-mode',
        data: {
          name: 'Private Mode',
          slug: 'privateMode',
          // navSection: 'menu', // In the nav menu we activate the modal rather than go to it in settings screen
          iconSlug: 'user-secret',
        },
        component: SettingsComponent
      },
    ]
  },
  {
    path: 'download',
    component: EmptyComponent,
    data: {
      slug: 'download'
    },
    children: [
      {
        path: '',
        data: {
          slug: 'download',
        },
        component: SettingsComponent
      },
    ]
  },

  {
    path: '**',
    data: {
      name: 'Not Found',
      slug: 'not-found',
    },
    component: NoContentComponent
  },
];


// @REMOVED What follows was an attempt to abuse Angular route guards to make sure the browser back button closes modals (instead of actually navigating back). The dealbreaker here was that it wouldn't work if you haven't yet navigated anywhere within the app: instead of trying to deactivate the route, browser would simply go back to where you were before the app. Tried to fix this by navigating to a dummy route and back to current URL on app initialization, but it didn't really work.
// interface CanComponentDeactivate {
//   canDeactivate: () => boolean;
// }
// @Injectable()
// export class CanDeactivateGuard implements CanDeactivate<CanComponentDeactivate> {
//   constructor(
//     private modalService: ModalService
//   ) {}

//   canDeactivate(/* component, route: ActivatedRouteSnapshot, state: RouterStateSnapshot */): boolean {
//     console.log('YO CAN WE DEACT?', this.modalService.activeModal);
//     if (
//       ! this.modalService.activeModal ||
//       this.modalService.activeModal === 'login' ||
//       this.modalService.activeModal === 'loading'
//     ) {
//       return true; // navigate freely!
//     }
//     else {
//       // Attempt to cancel the modal instead of navigating away
//       this.modalService.cancel();

//       // Now prevent the navigation. If we couldn't cancel the modal - good they should be stuck. If we did cancel the modal, they should be where they were before, and if they hit back again then they will be able to freely navigate away.
//       return false;
//     }
//   }
// }
// // Rather than hardcoding the guard into each route, just loop through them all
// function guardRoutes(route) {
//   route.canDeactivate = [CanDeactivateGuard];
//   if (route.children) {
//     _.each(route.children, guardRoutes);
//   }
// }
// _.each(ROUTES, guardRoutes);
