import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

@Injectable()
export class ScrollMonitorService {
  scroll$: Subject<void>;

  constructor() {
    this.scroll$ = new Subject<void>();
    window.addEventListener('scroll', _.throttle(
      this.onScroll.bind(this),
      100,
      { leading: true, trailing: true }
    ));
  }

  onScroll(event) {
    this.scroll$.next(null);
  }

}
