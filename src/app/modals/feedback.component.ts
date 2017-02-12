import {Component, ViewChild, ElementRef/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';

import {TooltipService} from '../utils/';
import {Logger} from '../utils/logger';


@Component({
  selector: 'feedback',
  providers: [ ],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent {

  feedbackText = '';
  
  isLoading = false;

  @ViewChild('submitButton') submitButton: ElementRef;
  @ViewChild('feedbackInput') feedbackInput: ElementRef;

  // @HostBinding('class.on') visible = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tooltipService: TooltipService,
    private dataService: DataService
   ) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.feedbackInput) {
        this.feedbackInput.nativeElement.focus();
      }
    }, 100);
  }

  ngOnDestroy() {
  }

  submit() {
    if (! this.feedbackText) {
      return;
    }

    this._logger.log('Submitting feedback:', this.feedbackText);

    this.isLoading = true;

    this.dataService.ref.root().child('feedback').push({
      feedback: this.feedbackText,
      timestamp: new Date().toString(),
      uid: this.dataService.user.uid,
      name: this.dataService.user.displayName,
      email: this.dataService.user.email
    }, (err) => { this.dataService.zone.run(() => {
      this.isLoading = false;

      if (err) {
        this._logger.error('Failed to submit feedback:', err);

        this.tooltipService.justTheTip(
          'Sorry, that didn\'t work! Try again please.<br><br>[' + (err.message || err.code || JSON.stringify(err)) + ']',
          this.submitButton.nativeElement,
          'error'
        );
        return;
      }

      this._logger.log('Feedback submitted successfully');

      this.tooltipService.justTheTip(
        'Thanks, you\'re the best!',
        this.submitButton.nativeElement,
        'success'
      );
      this.feedbackText = '';
    })});
  }

}
