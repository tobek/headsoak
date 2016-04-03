// App
export * from './app.component';
export * from './app.service';
export * from './account.service';
export * from './data.service';
export * from './pub-sub.service';

import {AppState} from './app.service';
import {AccountService} from './account.service';
import {DataService} from './data.service';
import {PubSubService} from './pub-sub.service';

// Application wide providers
export const APP_PROVIDERS = [
  AppState,
  AccountService,
  DataService,
  PubSubService,
];
