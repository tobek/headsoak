import { Component } from '@angular/core';
import { RouterConfig } from '@angular/router';
import { SettingsComponent, ShortcutsComponent } from './settings';
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
  { path: '', name: 'Write', component: EmptyComponent },
  { path: 'browse', name: 'Browse', component: EmptyComponent },
  { path: 'tags', name: 'Tags', component: EmptyComponent },
  { path: 'settings', name: 'Settings', component: SettingsComponent },
  { path: 'shortcuts', name: 'Shortcuts', component: ShortcutsComponent },
  { path: 'account', name: 'Account', component: AccountSettingsComponent },
  { path: '**', component: NoContent },
];
