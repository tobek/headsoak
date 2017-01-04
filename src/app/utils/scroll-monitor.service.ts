import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import * as _ from 'lodash';

// @TODO/optimization This should be run outside zone I think, it's triggering change detection on every check? Also maybe set up listener using `Observable`, see <http://stackoverflow.com/a/36849347/458614>
@Injectable()
export class ScrollMonitorService {
  scroll$ = new Subject<void>();

  constructor() {
    // Used to listen to `window` but now just <main> scrolls
    document.querySelector('main').addEventListener('scroll', _.throttle(
      this.onScroll.bind(this),
      100,
      { leading: true, trailing: true }
    ));
  }

  onScroll(event) {
    this.scroll$.next(null);
  }

}
