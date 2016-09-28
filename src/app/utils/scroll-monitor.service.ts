import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

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
