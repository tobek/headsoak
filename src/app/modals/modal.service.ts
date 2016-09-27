import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {ModalComponent} from './modal.component';

@Injectable()
export class ModalService {
  modal: ModalComponent;

  /** Emits changes in which modal is active. */
  activeModal$ = new ReplaySubject<string>(1);

  constructor(
  ) {
  }

  get isVisible(): boolean {
    return this.modal && this.modal.visible;
  }

  /** Whether there's an active modal that can be cancelled as opposed to a mandatory thing. Currently all modals are cancellable so just return true. */
  get isCancellable(): boolean {
    return this.modal && this.modal.visible && this.modal.cancellable;
  }

  close(evenIfUncancellable?: boolean): void {
    if (! this.modal) {
      return;
    }
    
    this.modal.close(evenIfUncancellable);
  }

  login(): void {
    this.activeModal$.next('login');
  }

  alert(message: string): void {
    this.modal.message = message;
    this.activeModal$.next('alert');
  }

  feedback(): void {
    this.activeModal$.next('feedback');
  }
}
