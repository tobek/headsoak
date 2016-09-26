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

  feedback(): void {
    this.modal.activeModal = 'feedback';
  }
}
