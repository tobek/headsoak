import { Component } from '@angular/core';
import { RouterConfig } from '@angular/router';
import { SettingsComponent } from './settings';
import { AccountSettingsComponent } from './account';
import { NoContent } from './no-content';

@Component({
  selector: 'empty-component',
  template: ''
})
class EmptyComponent {
  constructor() {}
}

export const routes: RouterConfig = [
  // @NOTE There's no easy or elegant way to preserve a view when switching between routes (even if we store all the data in a service, things like scroll position, input states etc would have to saved manually... ugly). So instead we put an empty component into the router outlet, and simply use the current router URL to toggle `hidden` on the views. For views where we don't care about persisting state, we can use the router properly.
  {
    // @TODO/rewrite This should be hidden on mobile
    path: 'focus',
    data: {
      name: 'Focus',
      slug: 'focus',
      navSection: 'main',
    },
    component: EmptyComponent
  },
  {
    path: '',
    data: {
      name: 'Write',
      slug: 'write',
      navSection: 'main',
    },
    component: EmptyComponent
  },
  {
    path: 'browse',
    data: {
      name: 'Browse',
      slug: 'browse',
      navSection: 'main',
    },
    component: EmptyComponent
  },
  {
    path: 'tags',
    data: {
      name: 'Tags',
      slug: 'tags',
      navSection: 'main',
    },
    component: EmptyComponent
  },

  {
    path: 'settings',
    data: {
      name: 'Settings',
      slug: 'settings',
      navSection: 'menu',
    },
    component: SettingsComponent
  },
  {
    path: 'shortcuts',
    data: {
      name: 'Shortcuts',
      slug: 'shortcuts',
      navSection: 'menu',
    },
    component: SettingsComponent
  },
  {
    path: 'account',
    data: {
      name: 'Account',
      slug: 'account',
      navSection: 'menu',
    },
    component: AccountSettingsComponent
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
