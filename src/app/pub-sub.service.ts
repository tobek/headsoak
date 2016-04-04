import {Injectable, NgZone} from 'angular2/core';
import {Subject} from 'rxjs/Subject';

@Injectable()
export class PubSubService {
  stream: Subject<any>;

  constructor(private zone: NgZone) {
    this.stream = new Subject<any>();
  }

  subscribe(fn) {
    this.stream.subscribe(fn);
  }

  emit(value) {
    // @TODO/rewrite having to run this in the zone probably indicates I'm not doing something right. Should every consumer listen to these streams as Observables on @Input-decorated properties? See http://blog.thoughtram.io/angular/2016/02/22/angular-2-change-detection-explained.html for example.
    this.zone.run(() => {
      this.stream.next(value);
    });
  }
}
