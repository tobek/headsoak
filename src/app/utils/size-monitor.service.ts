import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import * as _ from 'lodash';

// @TODO/optimization This should be run outside zone I think, it's triggering change detection on every check? Also maybe set up listener using `Observable`, see <http://stackoverflow.com/a/36849347/458614>
@Injectable()
export class SizeMonitorService {
  resize$ = new Subject<void>();
  isMobile = false;

  constructor() {
    window.addEventListener('resize', _.throttle(
      this.onResize.bind(this),
      500,
      { leading: true, trailing: true }
    ));

    this.onResize(); // run once right now to get it started
  }

  onResize(event?) {
    this.resize$.next(null);

    this.isMobile = Math.max(document.documentElement.clientWidth, window.innerWidth || 0) < 768;
  }

}
