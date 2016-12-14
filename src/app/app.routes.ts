import { Component } from '@angular/core';
import { Routes } from '@angular/router';
import { SettingsComponent } from './settings';
import { NoContentComponent } from './no-content';
import { EmptyComponent } from './utils';


/** Routes which contain NoteBrowserComponent. */
export const NOTE_BROWSER_ROUTES = [
  '/',
  '/scroll',
  '/browse',
];
export const DEFAULT_NOTE_ROUTE = '/';

export const ROUTES: Routes = [
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
      // iconSlug: 'th-large',
      iconSlug: 'columns',
    },
    component: EmptyComponent
  },
  {
    path: 'scroll',
    data: {
      name: 'Scroll',
      slug: 'scroll',
      navSection: 'main',
      iconSlug: 'bars',
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
