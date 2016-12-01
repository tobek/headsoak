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
import {ToasterService} from './toaster.service';
import {AccountService, UserService} from './account/';
import {NotesService} from './notes/';
import {TagsService} from './tags/';
import {ProgTagApiService} from './tags/prog-tag-api.service';
import {ProgTagLibraryService} from './tags/';
import {SettingsService} from './settings/';
import {AutocompleteService, ScrollMonitorService, TooltipService} from './utils/';

export * from './app.routes';

// Application wide providers - all services used in the application have to go here (from where they're injected into the main App componenet) or else DI can't find providers for them
export const APP_PROVIDERS = [
  ActiveUIsService,
  AnalyticsService,
  DataService,
  ModalService,
  ToasterService,
  TooltipService,
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
