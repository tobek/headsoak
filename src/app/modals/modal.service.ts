import {Injectable} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {Subject, ReplaySubject} from 'rxjs';

import {ModalComponent} from './modal.component';

@Injectable()
export class ModalService {
  modal: ModalComponent;

  /** Emits changes in which modal is active. */
  activeModal$ = new ReplaySubject<string>(1);

  closed$ = new Subject<void>();

  constructor(
  ) {
  }

  get activeModal(): string {
    return this.modal ? this.modal.activeModal : undefined;
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

  loading(): void {
    this.activeModal$.next('loading');
  }

  alert(message: string | SafeHtml): void {
    this.modal.generic({
      message: message
    });
  }

  prompt(
    message: string | SafeHtml,
    cb: (result: string) => boolean,
    opts // @TODO/refactor This should be of type ModalConfigType from ModalComponent
  ): void {
    const config = _.defaults({
      message: message,
      prompt: true,
      cancelButton: true,
      okCb: cb,
    }, opts);

    this.modal.generic(config);
  }

  feedback(): void {
    this.activeModal$.next('feedback');
  }
  privateMode(): void {
    this.activeModal$.next('privateMode');
  }
}
