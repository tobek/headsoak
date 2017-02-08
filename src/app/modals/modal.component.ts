import {Component, Input, ViewChild, ElementRef, HostBinding} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';
import {Subscription} from 'rxjs';

import {ModalService} from './modal.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {DataService} from '../data.service';
import {Logger, SizeMonitorService} from '../utils/';

import {Note, NoteComponent} from '../notes/';

export type ModalType = null | 'loading' | 'login' | 'feedback' | 'privateMode' | 'note' | 'generic';

export interface ModalConfig {
  /**
   * Called when OK is pressed (or enter in prompt), just before modal is closed. If it's a prompt and not cancelled, prompt contents is passed in, otherwise falsey value passed. Return explicit false to prevent modal from being closed. Callback is also passed two functions that control loading state of button.
   *
   * @NOTE @TODO/polish Since we have to run this before actually closing in order to see if we *should* close, navigation is impossible in `okCb` (because modal is closed via `window.history.back`, which will fire after `okCb`). For cancel and additional button callbacks, which can't control whether modal closes, this isn't an issue. One fix would be to have a separate `canOk` cb and then a `didOk` cb. */
  okCb?: (result?: any, showLoadingState?: Function, hideLoadingState?: Function) => any,

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

  /** Displayed with dark backdrop and no border. */
  DARK_SOLO_MODALS = [
    'note'
  ];

  @Input('second') second = false;

  @HostBinding('class.full-height') fullHeight = false;
  @HostBinding('class.windowed') windowed = true;
  @HostBinding('class.dark-solo') darkSolo = false;
  @HostBinding('class.on') visible = false;
  @HostBinding('class.cancellable') cancellable = true;

  _activeModal: ModalType;

  message: string | SafeHtml;

  config: ModalConfig = {};

  okButtonIsLoading = false;

  @ViewChild('okButton') okButton: ElementRef;
  @ViewChild('promptInput') promptInput: ElementRef;
  promptValue = '';

  note?: Note;
  @ViewChild(NoteComponent) noteComponent: NoteComponent;

  private activeModalSub: Subscription;
  private noteUpdatedSub: Subscription;

  private closeTimeout;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private modalService: ModalService,
    private sizeMonitorService: SizeMonitorService,
    private analyticsService: AnalyticsService,
    private dataService: DataService,
    private settings: SettingsService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    this.modalService['modal' + (this.second ? '2' : '')] = this;

    this.activeModalSub = this.modalService['setActiveModal' + (this.second ? '2$' : '$')]
      .subscribe((activeModal: ModalType) => {
        // setTimeout or else initial animation doesn't seem to work
        setTimeout(() => {
          this.activeModal = activeModal;
        }, 0);
      });

    this.noteUpdatedSub = this.dataService.notes.noteUpdated$.subscribe(this.noteUpdated.bind(this));
  }

  /** Not sure why this would ever happen as this is a singleton component that's always around, just visible or not visible, but putting this here anyway. */
  ngOnDestroy() {
    this.activeModalSub.unsubscribe();
    this.noteUpdatedSub.unsubscribe();

    if (this.modalService['modal' + (this.second ? '2' : '')] === this) {
      this.modalService['modal' + (this.second ? '2' : '')] = null;
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
    this.darkSolo = this.DARK_SOLO_MODALS.indexOf(modalName) !== -1;

    this.visible = !! modalName;

    if (modalName === 'note' && this.note) {
      if (! this.sizeMonitorService.isMobile || ! this.note.body) {
        setTimeout(() => {
          if (this.noteComponent) {
            this.noteComponent.bodyFocus();
          }
        }, 200);
      }
    }

    this.modalService.modalChange$.next(modalName);
  }

  clear() {
    this.closeTimeout = null;

    this.activeModal = null;

    this.config = {};

    this.promptValue = '';

    delete this.note;
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
    else {
      this.cancellable = true; // otherwise we'll get stuck at `ModalService`'s `onPopstate` which `this.close` triggers via `history.back`
    }

    this.close(this.config.cancelCb());
  }


  close(cb?: Function) {
    if (this.activeModal === 'login' || this.activeModal === 'loading') {
      this._close();

      if (cb) {
        cb();
      }
    }
    else {
      // Funnel all closures via popstate - see `onPopstate` in `ModalService`

      // There's a delay before popstate actually fires, which means if we fire callback even after calling `window.history.back()`, the callback will fire before modal starts closing. This ensures that doesn't happen
      if (cb) {
        jQuery(window).one('popstate', () => {
          // Seems like we have to wait yet one more tick...
          setTimeout(cb, 0);
        });
      }

      window.history.back();
    }
  }

  _close() {
    if (! this.second) {
      this.modalService.closed$.next(null);
    }

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

  noteUpdated(note: Note): void {
    if (note.deleted && note === this.note) {
      this.close();
    }
  }

}
