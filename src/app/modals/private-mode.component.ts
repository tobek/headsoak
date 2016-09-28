import {Component/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';

import {Logger} from '../utils/logger';


@Component({
  selector: 'private-mode',
  pipes: [ ],
  providers: [ ],
  directives: [
  ],
  templateUrl: './private-mode.component.html'
})
export class PrivateModeComponent {

  password = '';
  
  isLoading = false;
  isError = false;

  // @HostBinding('class.on') visible = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  enable(): void {
    // @TODO/now Do this

    // if (! this.password) {
    //   return;
    // }

    // @TODO/ece Loading state here. Maybe spinner in button? Full overlay of modal?

    // this._logger.log('Submitting feedback:', this.feedbackText);

    // this.isLoading = true;

    if (true) { // success
      this.dataService.accountService.privateMode = true;
      this.password = '';
    }
  }

  disable(): void {
    this.dataService.accountService.privateMode = false;
  }

}
