import {Component, ViewChild, ElementRef/*, HostBinding*/} from '@angular/core';

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

  @ViewChild('passwordInput') passwordInput: ElementRef;

  // @HostBinding('class.on') visible = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService
   ) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.passwordInput.nativeElement.focus();
    }, 100);
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
    this.isLoading = true;

    this.dataService.accountService.checkPassword(this.password, (error) => {
      this.isLoading = false;

      if (error) {
        this._logger.log('Failed to enable private mode');
        this.errorMessage = error; // @TODO/tooltip Should be error tooltip over button
        return;
      }

      this._logger.log('Successfully enabled private mode');
      // @TODO/toaster Show toaster and then close modal (if we're in a modal)
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
