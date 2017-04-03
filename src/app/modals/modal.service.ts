import {Injectable} from '@angular/core';
import {DomSanitizer, SafeHtml} from '@angular/platform-browser';
import {Subject, ReplaySubject, Subscription} from 'rxjs';

import {ModalComponent, ModalType, ModalConfig} from './modal.component';
import {Note} from '../notes/';
import {Tag} from '../tags/';
import {Logger} from '../utils/';

import * as _ from 'lodash';

@Injectable()
export class ModalService {
  modal: ModalComponent;

  /** Used for when we need modals... on top of other modals. Only for modals that use `generic` type. @NOTE This has not been extensively tested and is just for simple modals like alerts and prompts, and might break when used for other stuff (e.g. account service has a complex prompt where it references elements in the modal in order to display error messages - not ideal - which wouldn't work if it used `modal2`). Also, anything checking visibility/cancellability/active modal will just get regular `modal`, but that should be okay if `modal2` is only ever used if `modal` is in effect (in theory something could close `modal` and `modal2` would remain open, but not sure if that's currently possible and is an edge case anyway, but if we wanted we could auto close `modal2` if `modal` closes - but we might not want that).  */
  modal2: ModalComponent;

  /** Used for ModalService to update modal state. We need to use ReplaySubject here cause ModalComponents may not be initialized when we run, but they'll be able to pick up the right modal type when they are. */
  setActiveModal$ = new ReplaySubject<ModalType>(1);
  setActiveModal2$ = new ReplaySubject<ModalType>(1);

  get setUnusedActiveModal$(): ReplaySubject<ModalType> {
    return this.modal.visible ? this.setActiveModal2$ : this.setActiveModal$;
  }
  get unusedModal(): ModalComponent {
    return this.modal.visible ? this.modal2 : this.modal;
  }

  /** Emits whenever any modal changes state (whether initiated by us or by the modal itself). Currently no need to distinguish between the two modals. */
  modalChange$ = new Subject<ModalType>();

  closed$ = new Subject<void>();

  private modalChangeSub: Subscription;
  private _logger: Logger = new Logger('ModalService');

  constructor(
    private sanitizer: DomSanitizer
  ) {
    this.modalChangeSub = this.modalChange$.subscribe(this.onModalChange.bind(this));

    window.addEventListener('popstate', this.onPopstate.bind(this));
  }

  ngOnDestroy() {
    this.modalChangeSub.unsubscribe();
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
    this.setActiveModal$.next('login');
  }

  loading(): void {
    this.setActiveModal$.next('loading');
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
      okCb: () => { cb(true); },
      cancelCb: () => { cb(false); },
    });
  }

  prompt(
    message: string,
    cb: (result: string, showLoadingState?: Function, hideLoadingState?: Function) => any,
    trustAsHtml = false,
    opts: ModalConfig = {}
  ): void {
    const component = this.modal.visible ? this.modal2 : this.modal;

    const config: ModalConfig = _.defaults({
      message: trustAsHtml ? this.sanitizer.bypassSecurityTrustHtml(message) : message,
      prompt: true,
      cancelButton: true,
      okCb: cb,
    }, opts);

    component.generic(config);
  }

  generic(config: ModalConfig, trustAsHtml = false) {
    if (trustAsHtml && config.message) {
      config.message = this.sanitizer.bypassSecurityTrustHtml(<string> config.message);
    }

    this.modal.generic(config);
  }

  faq(): void {
    this.setUnusedActiveModal$.next('faq');
  }
  feedback(): void {
    this.setActiveModal$.next('feedback');
  }
  privateMode(): void {
    this.setActiveModal$.next('privateMode');
  }
  progTagLibTag(tag: Tag): void {
    this.modal.tag = tag;
    this.setActiveModal$.next('progTagLibTag');
  }

  note(note: Note): void {
    this.unusedModal.note = note;
    this.setUnusedActiveModal$.next('note');
  }


  /** Push state so we have something to "back" to, otherwise back will actually navigate to previous route or whatever was open before app was open. */
  onModalChange(modalType: ModalType) {
    // this._logger.log('modal changed to', modalType);
    if (
      ! modalType ||
      modalType === 'login' ||
      modalType === 'loading'
    ) {
      return;
    }
    // this._logger.log('pushing history state');

    window.history.pushState({ modal: modalType }, '');
  }
  /** ALL modal closures go through this function. If user hits back button, this will be activated. If user closes modal by other means, `ModalComponent` simply calls `history.back()`. */
  onPopstate() {
    const modal = this.modal2.visible ? this.modal2 : this.modal;

    // this._logger.log('history state popped, modal is', modal.activeModal, modal);

    if (
      ! modal.activeModal ||
      modal.activeModal === 'login' ||
      modal.activeModal === 'loading'
    ) {
      return;
    }

    if (! modal.cancellable) {
      // Basically back button will do nothing - unless they hit back enough times that they leave the app
      return;
    }

    // this._logger.log('actually closing modal');

    modal._close();
  }
}
