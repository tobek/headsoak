import {Component, ViewChild, ElementRef, HostBinding} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {Subscription} from 'rxjs';

import {ModalService} from './modal.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Logger} from '../utils/logger';

type ModalType = null | 'loading' | 'login' | 'feedback' | 'privateMode' | 'generic';

export interface ModalConfig {
  okCb?: (result?: any, showLoadingState?: Function, hideLoadingState?: Function) => any, // Called when OK is pressed (or enter in prompt), just before modal is closed. If it's a prompt and not cancelled, prompt contents is passed in, otherwise falsey value passed. Return explicit false to prevent modal from being closed. Callback is also passed two functions that control loading state of button.

  message?: string | SafeHtml,
  okButtonText?: string,
  cancelButton?: boolean, // whether to show or not
  cancelCb?: () => any,

  prompt?: boolean,
  promptPlaceholder?: string,
  promptInputType?: string,

  additionalButtons?: [{
    text: string,
    cb: Function, // called when button is pressed (modal is closed first)
  }]
}

@Component({
  selector: 'modal',
  providers: [ ],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  UNCANCELLABLE_MODALS = [
    'login',
    'loading',
  ];

  FULL_HEIGHT_MODALS = [
    'login',
    'loading',
  ];

  // @ViewChild(NoteComponent) noteComponent: NoteComponent;

  @HostBinding('class.full-height') fullHeight = false;
  @HostBinding('class.windowed') windowed = true;
  @HostBinding('class.on') visible = false;
  @HostBinding('class.cancellable') cancellable = true;

  _activeModal: ModalType;

  message: string | SafeHtml;

  config: ModalConfig = {};

  okButtonIsLoading = false;

  @ViewChild('okButton') okButton: ElementRef;
  @ViewChild('promptInput') promptInput: ElementRef;
  promptValue = '';

  private activeModalSub: Subscription;

  private closeTimeout;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private modalService: ModalService,
    private analyticsService: AnalyticsService,
    private settings: SettingsService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    this.modalService.modal = this;

    this.modalService.activeModal$.subscribe((activeModal: ModalType) => {
      // setTimeout or else initial animation doesn't seem to work
      setTimeout(() => {
        this.activeModal = activeModal;
      }, 0);
    });
  }

  /** Not sure why this would ever happen as this is a singleton service that's always around, just visible or not visible, but putting this here anyway. */
  ngOnDestroy() {
    this.activeModalSub.unsubscribe();

    if (this.modalService.modal === this) {
      this.modalService.modal = null;
    }
  }

  get activeModal(): ModalType {
    return this._activeModal;
  }
  set activeModal(modalName: ModalType) {
    if (this.closeTimeout) {
      // Something else set up a modal before a previous close's timeout had cleared it, so clear it now 
      clearTimeout(this.closeTimeout);
      this.clear();
    }

    this._activeModal = modalName;

    this.cancellable = this.UNCANCELLABLE_MODALS.indexOf(modalName) === -1;
    this.fullHeight = this.FULL_HEIGHT_MODALS.indexOf(modalName) !== -1;
    this.windowed = ! this.fullHeight;

    this.visible = !! modalName;
  }

  clear() {
    this.closeTimeout = null;

    this.activeModal = null;

    this.config = {};

    this.promptValue = '';
  }

  okButtonShowLoading() {
    this.okButtonIsLoading = true;
  }
  okButtonHideLoading() {
    this.okButtonIsLoading = false;
  }

  /** User has accepted or completed modal. */
  ok() {
    if (this.config.okCb) {
      const shouldClose = this.config.okCb(
        this.promptValue,
        this.okButtonShowLoading.bind(this),
        this.okButtonHideLoading.bind(this)
      );
      
      if (shouldClose === false) {
        return;
      }
    }

    this.close();
  }

  cancel(evenIfUncancellable = false) {
    if (! this.cancellable && ! evenIfUncancellable) {
      return;
    }

    if (this.config.cancelCb) {
      this.config.cancelCb();
    }

    this.close();
  }


  close() {
    this.modalService.closed$.next(null);

    // Start the whole thing fading
    this.visible = false;

    // Can't remove activeModal immediately or it'll disappear while modal is fading and properties like full-height will change, so wait a little (1500 is longest transition duration we're currently using)
    if (! this.closeTimeout) {
      this.closeTimeout = setTimeout(this.clear.bind(this), 1500);
    }
  }

  generic(config: ModalConfig): void {
    this.config = config;
    this.activeModal = 'generic';

    if (config.prompt) {
      setTimeout(() => {
        this.promptInput.nativeElement.focus();
      }, 100);
    }
    // @TODO/modal Should focus on "ok" button if no prompt, so they can accept with enter/space
  }

}
