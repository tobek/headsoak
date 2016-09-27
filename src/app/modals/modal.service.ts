import {Injectable} from '@angular/core';

import {ModalComponent} from './modal.component';

@Injectable()
export class ModalService {
  modal: ModalComponent;

  constructor(
  ) {
  }

  get isVisible(): boolean {
    return this.modal && this.modal.visible;
  }

  /** Whether there's an active modal that can be cancelled as opposed to a mandatory thing. Currently all modals are cancellable so just return true. */
  get isCancellable(): boolean {
    return true;
  }

  close(): void {
    this.modal.close();
  }

  feedback(): void {
    this.modal.activeModal = 'feedback';
  }
}
