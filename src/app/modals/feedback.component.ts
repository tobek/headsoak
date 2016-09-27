import {Component/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';

import {Logger} from '../utils/logger';


@Component({
  selector: 'feedback',
  pipes: [ ],
  providers: [ ],
  directives: [
  ],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent {

  feedbackText = '';
  feedbackSubmitted = false;
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

  submit() {
    // @TODO/ece Loading state here. Maybe spinner in button? Full overlay of modal?

    this._logger.log('Submitting feedback:', this.feedbackText);

    this.isLoading = true;

    this.dataService.ref.child('feedback').push({
      feedback: this.feedbackText,
      timestamp: new Date().toString(),
      uid: this.dataService.user.uid,
      name: this.dataService.user.displayName,
      email: this.dataService.user.email
    }, (err) => {
      this.isLoading = false;
      this.isError = false;

      if (err) {
        this._logger.error('Failed to submit feedback:', err);
        this.isError = true;
        return;
      }

      this._logger.log('Feedback submitted successfully');
      this.feedbackSubmitted = true;
    });
  }

}
