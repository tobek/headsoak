import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { SettingsComponent } from './settings';
import { NoContentComponent } from './no-content';
import { EmptyComponent } from './utils';


/** Routes which contain NoteBrowserComponent. */
export const NOTE_BROWSER_ROUTES = [
  '/',
  // '/write',
  // '/focus',
  '/browse',
  '/list',
];
export const DEFAULT_NOTE_ROUTE = '/';

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
    path: '**',
    data: {
      name: 'Not Found',
      slug: 'not-found',
    },
    component: NoContentComponent
  },
];
