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
    path: '',
    data: { name: 'Write', slug: 'write' },
    component: EmptyComponent
  },
  {
    path: 'browse',
    data: { name: 'Browse', slug: 'browse' },
    component: EmptyComponent
  },
  {
    path: 'tags',
    data: { name: 'Tags', slug: 'tags' },
    component: EmptyComponent
  },
  {
    path: 'settings',
    data: { name: 'Settings', slug: 'settings' },
    component: SettingsComponent
  },
  {
    path: 'shortcuts',
    data: { name: 'Shortcuts', slug: 'shortcuts' },
    component: SettingsComponent
  },
  {
    path: 'account',
    data: { name: 'Account', slug: 'account' },
    component: AccountSettingsComponent
  },
  {
    path: '**',
    data: { hideFromNav: true, name: 'Not Found', slug: 'not-found' },
    component: NoContent
  },
];
