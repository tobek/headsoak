import {Subject} from 'rxjs/Subject';

export class PubSubService {
  stream: Subject<any>;

  constructor() {
    this.stream = new Subject<any>();
  }

  subscribe(fn) {
    this.stream.subscribe(fn);
  }

  emit(value) {
    this.stream.next(value);
  }
}
