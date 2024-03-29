import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import {
  NgModule,
  ApplicationRef
} from '@angular/core';
import {
  RouterModule,
  PreloadAllModules
} from '@angular/router';

import {SelectModule} from 'ng2-select';

/*
 * Platform and Environment providers/directives/pipes
 */
import { ENV_PROVIDERS } from './environment';
import { ROUTES } from './app.routes';

// App is our top level component

import { AppComponent } from './app.component';
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
  AppComponent,
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


import {ContenteditableModelDirective, TouchOrClickDirective} from './directives';

const APP_DIRECTIVES = [
  ContenteditableModelDirective,
  TouchOrClickDirective,
];


import {DatePipe} from '@angular/common'; // since we want to actually use this as a service (outside of templates) we need to add it to the providers
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
import {AutocompleteService, SizeMonitorService, ScrollMonitorService, SyntaxService, ToasterService, TooltipService} from './utils/';
// import {CanDeactivateGuard} from './app.routes';

// Application wide providers - all services used in the application have to go here (from where they're injected into the main App componenet) or else DI can't find providers for them
const APP_PROVIDERS = [
  DatePipe,
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
  SizeMonitorService,
  ScrollMonitorService,
  // CanDeactivateGuard,
];


// import { PLATFORM_PIPES } from '@angular/core';
import {ArrayLimitPipe} from './pipes/array-limit.pipe';
import {InternalTagsFilterPipe} from './pipes/internal-tags-filter.pipe';
import {MapIdsToTagsPipe} from './pipes/map-ids-to-tags.pipe';

const APP_PIPES = [
  ArrayLimitPipe,
  InternalTagsFilterPipe,
  MapIdsToTagsPipe,
];


import '../styles/main.sass';


/**
 * `AppModule` is the main entry point into Angular2's bootstraping process
 */
@NgModule({
  bootstrap: [ AppComponent ],
  declarations: [
    ...APP_COMPONENTS,
    ...APP_DIRECTIVES,
    ...APP_PIPES,
  ],
  imports: [ // import Angular's modules
    BrowserModule,
    FormsModule,
    HttpModule,
    RouterModule.forRoot(ROUTES, {
      useHash: true, // @TODO/polish Would be nice to set this to false, but then refreshing in AWS cloudfront-deployed page leads to a 404 - prob some config will fix this.
      preloadingStrategy: PreloadAllModules,
    }),

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
