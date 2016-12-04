import {Component/*, ViewChild, ElementRef, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Logger} from '../utils/logger';

@Component({
  selector: 'homepage',
  pipes: [ ],
  providers: [ ],
  directives: [
  ],
  templateUrl: './homepage.component.html'
})
export class HomepageComponent {

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService
   ) {}

  ngOnInit() {
  }


}
