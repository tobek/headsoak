// App
export * from './active-uis.service';
export * from './analytics.service';
export * from './app.component';
export * from './data.service';
export * from './modals/modal.service';

import {ActiveUIsService} from './active-uis.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {ModalService} from './modals/modal.service';
import {AccountService, UserService} from './account/';
import {NotesService} from './notes/';
import {TagsService} from './tags/';
import {ProgTagApiService} from './tags/prog-tag-api.service';
import {ProgTagLibraryService} from './tags/';
import {SettingsService} from './settings/';
import {AutocompleteService, ScrollMonitorService} from './utils/';

export * from './app.routes';

// Application wide providers
export const APP_PROVIDERS = [
  ActiveUIsService,
  AnalyticsService,
  DataService,
  ModalService,
  AccountService,
  UserService,
  NotesService,
  TagsService,
  ProgTagApiService,
  ProgTagLibraryService,
  SettingsService,
  AutocompleteService,
  ScrollMonitorService,
];
