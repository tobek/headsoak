// App
export * from './analytics.service';
export * from './app.component';
export * from './app.service';
export * from './data.service';

import {AnalyticsService} from './analytics.service';
import {AppState} from './app.service';
import {DataService} from './data.service';
import {AccountService, UserService} from './account/';
import {NotesService} from './notes/';
import {TagsService} from './tags/';
import {AutocompleteService, ScrollMonitorService} from './utils/';

// export * from './app.routes';

// Application wide providers
export const APP_PROVIDERS = [
  AnalyticsService,
  AppState,
  DataService,
  AccountService,
  UserService,
  NotesService,
  TagsService,
  AutocompleteService,
  ScrollMonitorService,
];
