import {Component} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account';
import {NoteBrowserComponent} from '../notes/';


@Component({
  selector: 'home',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    NoteBrowserComponent,
  ],
  styleUrls: [],
  templateUrl: './home.html'
})
export class HomeComponent {
  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');
  }

}
