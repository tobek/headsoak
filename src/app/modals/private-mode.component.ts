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
  errorMessage = '';

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

  // @TODO/privacy Modal should disappear when enabled/disabled, but with a toaster saying what happened?

  enable(): void {
    if (! this.password) {
      return;
    }

    this._logger.log('Enabling private mode');

    this.errorMessage = '';
    // @TODO/ece Loading state here. Maybe spinner in button? Full overlay of modal?
    this.isLoading = true;

    this.dataService.accountService.checkPassword(this.password, (error) => {
      this.isLoading = false;

      if (error) {
        this._logger.log('Failed to enable private mode');
        this.errorMessage = error;
        return;
      }

      this._logger.log('Successfully enabled private mode');
      this.dataService.accountService.enablePrivateMode();
      this.password = '';
    });

  }

  disable(): void {
    this._logger.log('Disabling private mode');
    this.errorMessage = '';
    this.dataService.accountService.disablePrivateMode();
  }

}
