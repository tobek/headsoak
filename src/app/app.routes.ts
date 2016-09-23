import { Component } from '@angular/core';
import { RouterConfig } from '@angular/router';
import { SettingsComponent } from './settings';
import { NoContent } from './no-content';

/** @NOTE Empty component that we can plug into routes in order to have some route behavior (e.g. listening to URL changes, browser history, etc.) without being restricted to defining routes by a component. Primarily, there's no easy or elegant way to preserve a view when switching between routes (even if we store all the data in a service, things like scroll position, input states etc would have to saved manually... ugly). So instead we put an empty component into the router outlet, and simply use the current router URL to toggle `hidden` or use `*ngIf` on the views. For views where we don't care about persisting state, we can use the router properly. */
@Component({
  selector: 'empty-component',
  // We need a router outlet in our empty component so that we can have child routes (that use EmptyComponent) open up components in there
  template: '<router-outlet></router-outlet>'
})
class EmptyComponent {
  constructor() {}
}

export const routes: RouterConfig = [
  {
    // @TODO/rewrite This should be hidden on mobile
    path: 'focus',
    data: {
      name: 'Focus',
      slug: 'focus',
      // navSection: 'main', // @TODO/rewrite Hidden entirely for now - we'll support it from elsewhere? Menu or as a note action?
      iconSlug: 'square',
    },
    component: EmptyComponent
  },
  {
    path: '',
    data: {
      name: 'Write',
      slug: 'write',
      navSection: 'main',
      iconSlug: 'th-large',
    },
    component: EmptyComponent
  },
  {
    path: 'browse',
    data: {
      name: 'Browse',
      slug: 'browse',
      navSection: 'main',
      iconSlug: 'th',
    },
    component: EmptyComponent
  },
  {
    path: 'tags',
    data: {
      name: 'Tags',
      slug: 'tags',
      navSection: 'main',
      iconSlug: 'hashtag',
    },
    component: EmptyComponent
  },

  // @HACK These should be in `children` array of `/tags` path but I can't get it to work.
  {
    path: 'tags/:tagId/:tagName',
    component: EmptyComponent
  },
  {
    path: 'tags/:tagId/:tagName/:section',
    component: EmptyComponent
  },

  {
    path: 'settings',
    component: EmptyComponent,
    data: {
      slug: 'settings'
    },
    children: [
      {
        path: '',
        data: {
          name: 'Settings',
          slug: 'settings',
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
        path: 'account',
        data: {
          name: 'Account',
          slug: 'account',
          navSection: 'menu',
          iconSlug: 'smile-o',
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
    component: NoContent
  },
];
