import {Component/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
// import {Logger} from '../utils/logger';


@Component({
  selector: 'feedback',
  pipes: [ ],
  providers: [ ],
  directives: [
  ],
  templateUrl: './feedback.component.html'
})
export class FeedbackComponent {

  // @HostBinding('class.on') visible = false;

  // private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
   ) {}

  ngOnInit() {
  }

  ngOnDestroy() {
  }

}
