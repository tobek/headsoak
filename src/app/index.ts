// App
export * from './app.component';
export * from './app.service';
export * from './account';
export * from './data.service';

import {AppState} from './app.service';
import {AccountService} from './account/account.service';
import {DataService} from './data.service';

// Application wide providers
export const APP_PROVIDERS = [
  AppState,
  AccountService,
  DataService,
];
