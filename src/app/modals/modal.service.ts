import {Injectable} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Subject, ReplaySubject} from 'rxjs';

import {ModalComponent, ModalType, ModalConfig} from './modal.component';
import {Note} from '../notes/';

import * as _ from 'lodash';

@Injectable()
export class ModalService {
  modal: ModalComponent;

  /** Used for when we need modals... on top of other modals. @NOTE This has not been extensively tested and is just for simple modals like alerts and prompts, and might break when used for other stuff (e.g. account service has a complex prompt where it references elements in the modal in order to display error messages - not ideal - which wouldn't work if it used `modal2`). Also, anything checking visibility/cancellability/active modal will just get regular `modal`, but that should be okay if `modal2` is only ever used if `modal` is in effect (in theory something could close `modal` and `modal2` would remain open, but not sure if that's currently possible and is an edge case anyway, but if we wanted we could auto close `modal2` if `modal` closes - but we might not want that).  */
  modal2: ModalComponent;

  /** Emits changes in which modal is active. */
  activeModal$ = new ReplaySubject<ModalType>(1);
  activeModal2$ = new ReplaySubject<ModalType>(1);

  closed$ = new Subject<void>();

  constructor(
    private sanitizer: DomSanitizer
  ) {
  }

  get activeModal(): ModalType {
    return this.modal ? this.modal.activeModal : undefined;
  }

  get isVisible(): boolean {
    return this.modal && this.modal.visible;
  }

  /** Whether there's an active modal that can be cancelled as opposed to a mandatory thing. */
  get isCancellable(): boolean {
    return this.modal && this.modal.visible && this.modal.cancellable;
  }

  cancel(evenIfUncancellable?: boolean): void {
    if (! this.modal || ! this.modal.visible) {
      return;
    }
    
    this.modal.cancel(evenIfUncancellable);
  }

  close(): void {
    if (! this.modal || ! this.modal.visible) {
      return;
    }
    
    this.modal.close();
  }

  login(): void {
    this.activeModal$.next('login');
  }

  loading(): void {
    this.activeModal$.next('loading');
  }

  alert(message: string, trustAsHtml = false, okButtonText?: string, cb = () => {}): void {
    const component = this.modal.visible ? this.modal2 : this.modal;

    component.generic({
      message: trustAsHtml ? this.sanitizer.bypassSecurityTrustHtml(message) : message,
      okButtonText: okButtonText,
      okCb: cb,
      cancelCb: cb,
    });
  }

  confirm(message: string, cb: (accepted: boolean) => any, trustAsHtml = false, okButtonText?: string): void {
    const component = this.modal.visible ? this.modal2 : this.modal;

    component.generic({
      message: trustAsHtml ? this.sanitizer.bypassSecurityTrustHtml(message) : message,
      okButtonText: okButtonText,
      cancelButton: true,
      okCb: () => { cb(true) },
      cancelCb: () => { cb(false) },
    });
  }

  prompt(
    message: string | SafeHtml,
    cb: (result: string, showLoadingState?: Function, hideLoadingState?: Function) => any,
    opts: ModalConfig
  ): void {
    const component = this.modal.visible ? this.modal2 : this.modal;

    const config: ModalConfig = _.defaults({
      message: message,
      prompt: true,
      cancelButton: true,
      okCb: cb,
    }, opts);

    component.generic(config);
  }

  generic(config: ModalConfig) {
    this.modal.generic(config);
  }

  feedback(): void {
    this.activeModal$.next('feedback');
  }
  privateMode(): void {
    this.activeModal$.next('privateMode');
  }

  note(note: Note): void {
    this.modal.note = note;
    this.activeModal$.next('note');
  }
}
