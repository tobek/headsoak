import { NgModule, ApplicationRef } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, PreloadAllModules } from '@angular/router';
import { removeNgStyles, createNewHosts, createInputTransfer } from '@angularclass/hmr';

/*
 * Platform and Environment providers/directives/pipes
 */
import { ENV_PROVIDERS } from './environment';
import { ROUTES } from './app.routes';
// App is our top level component
import { AppComponent } from './app.component';
import { HomeComponent } from './home';
import { AboutComponent } from './about';
import { NoContentComponent } from './no-content';

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
import {AutocompleteService, ScrollMonitorService, ToasterService, TooltipService} from './utils/';

// import { PLATFORM_PIPES } from '@angular/core';
import {ArrayLimitPipe} from './pipes/array-limit.pipe';


// Application wide providers - all services used in the application have to go here (from where they're injected into the main App componenet) or else DI can't find providers for them
const APP_PROVIDERS = [

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

  ArrayLimitPipe,
];

/**
 * `AppModule` is the main entry point into Angular2's bootstraping process
 */
@NgModule({
  bootstrap: [ AppComponent ],
  declarations: [
    AppComponent,
    // @TODO/now Can move all components into here?
    // AboutComponent,
    // HomeComponent,
    // NoContentComponent,
    // XLarge
  ],
  imports: [ // import Angular's modules
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(ROUTES, { useHash: true, preloadingStrategy: PreloadAllModules })
  ],
  providers: [ // expose our Services and Providers into Angular's dependency injection
    ENV_PROVIDERS,
    APP_PROVIDERS
  ]
})
export class AppModule {
  constructor(public appRef: ApplicationRef) {}

}

