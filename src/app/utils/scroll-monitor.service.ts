import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import * as _ from 'lodash';

// @TODO/optimization This should be run outside zone I think, it's triggering change detection on every check? Also maybe set up listener using `Observable`, see <http://stackoverflow.com/a/36849347/458614>
@Injectable()
export class ScrollMonitorService {
  lastScrollY = 0;
  scroll$ = new Subject<number>();

  private scrollingEl: Element;

  constructor() {}

  init() {
    // We used to listen to `window` but now just <main> scrolls
    this.scrollingEl = document.querySelector('main');

    this.scrollingEl.addEventListener('scroll', _.throttle(
      this.onScroll.bind(this),
      200,
      { leading: true, trailing: true }
    ));

    this.lastScrollY = this.scrollingEl.scrollTop;
  }

  onScroll(event) {
    const newScrollY = this.scrollingEl.scrollTop;

    this.scroll$.next(newScrollY);

    this.lastScrollY = newScrollY;
  }

}
