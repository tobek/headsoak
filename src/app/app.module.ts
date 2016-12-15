import { NgModule, ApplicationRef } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, PreloadAllModules } from '@angular/router';
import { removeNgStyles, createNewHosts, createInputTransfer } from '@angularclass/hmr';

import {SelectModule} from 'ng2-select';

/*
 * Platform and Environment providers/directives/pipes
 */
import { ENV_PROVIDERS } from './environment';
import { ROUTES } from './app.routes';

// App is our top level component

import { App } from './app.component';
import { HomeComponent } from './home';
import { NoContentComponent } from './no-content';

import {LoginComponent} from './account';

import {NoteComponent, NoteBrowserComponent, NoteQueryComponent} from './notes/';

import {TagComponent, TagBrowserComponent, TagDetailsComponent, TagVisualizationComponent, ProgTagLibraryComponent, ProgTagControlComponent} from './tags/';

import {ModalComponent} from './modals/modal.component';
import {HomepageComponent} from './modals/homepage.component';
import {FeedbackComponent} from './modals/feedback.component';
import {PrivateModeComponent} from './modals/private-mode.component';

import {SettingsComponent, SettingComponent} from './settings/';

import {EmptyComponent, ForceGraphComponent} from './utils/';

const APP_COMPONENTS = [
  App,
  HomeComponent,
  NoContentComponent,
  EmptyComponent,

  LoginComponent,

  NoteComponent,
  NoteBrowserComponent,
  NoteQueryComponent,

  TagComponent,
  TagBrowserComponent,
  TagDetailsComponent,
  TagVisualizationComponent,
  ProgTagLibraryComponent,
  ProgTagControlComponent,

  ModalComponent,
  HomepageComponent,
  FeedbackComponent,
  PrivateModeComponent,

  SettingsComponent,
  SettingComponent,

  ForceGraphComponent,
];


import {ActiveUIsService} from './active-uis.service';
import {AnalyticsService} from './analytics.service';
import {DataService} from './data.service';
import {ModalService} from './modals/modal.service';
import {AccountService, UserService} from './account/';
import {NotesService} from './notes/';
import {TagsService} from './tags/';
import {ProgTagApiService} from './tags/prog-tag-api.service';
import {ProgTagLibraryService} from './tags/';
import {SettingsService} from './settings/settings.service';
import {AutocompleteService, ScrollMonitorService, SyntaxService, ToasterService, TooltipService} from './utils/';

// Application wide providers - all services used in the application have to go here (from where they're injected into the main App componenet) or else DI can't find providers for them
const APP_PROVIDERS = [

  ActiveUIsService,
  AnalyticsService,
  DataService,
  ModalService,
  SyntaxService,
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


// import { PLATFORM_PIPES } from '@angular/core';
import {ArrayLimitPipe} from './pipes/array-limit.pipe';
import {InternalTagsFilterPipe} from './pipes/internal-tags-filter.pipe';

const APP_PIPES = [
  ArrayLimitPipe,
  InternalTagsFilterPipe,
];


/**
 * `AppModule` is the main entry point into Angular2's bootstraping process
 */
@NgModule({
  bootstrap: [ App ],
  declarations: [
    ...APP_COMPONENTS,
    ...APP_PIPES,
  ],
  imports: [ // import Angular's modules
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(ROUTES, { useHash: true, preloadingStrategy: PreloadAllModules }),

    SelectModule,
  ],
  providers: [ // expose our Services and Providers into Angular's dependency injection
    ENV_PROVIDERS,
    APP_PROVIDERS
  ]
})
export class AppModule {
  constructor(public appRef: ApplicationRef) {}

}

