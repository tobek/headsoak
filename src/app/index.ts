// App
export * from './active-uis.service';
export * from './analytics.service';
export * from './app.component';
export * from './data.service';

import {ActiveUIsService} from './active-uis.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {AccountService, UserService} from './account/';
import {NotesService} from './notes/';
import {TagsService} from './tags/';
import {SettingsService} from './settings/';
import {AutocompleteService, ScrollMonitorService} from './utils/';

export * from './app.routes';

// Application wide providers
export const APP_PROVIDERS = [
  ActiveUIsService,
  AnalyticsService,
  DataService,
  AccountService,
  UserService,
  NotesService,
  TagsService,
  SettingsService,
  AutocompleteService,
  ScrollMonitorService,
];
