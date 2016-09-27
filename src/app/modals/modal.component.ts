import {Component/*, ViewChild*/, HostBinding} from '@angular/core';
import {Subscription} from 'rxjs';

import {ModalService} from './modal.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account/';
import {FeedbackComponent} from './feedback.component';


type ModalType = null | 'login' | 'feedback' | 'alert';

@Component({
  selector: 'modal',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    FeedbackComponent,
  ],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  UNCANCELLABLE_MODALS = [
    'login',
  ];

  // @ViewChild(NoteComponent) noteComponent: NoteComponent;

  @HostBinding('class.on') visible = false;
  @HostBinding('class.cancellable') cancellable = true;

  _activeModal: ModalType;

  message: string;

  private activeModalSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public modalService: ModalService,
    public analyticsService: AnalyticsService,
    public settings: SettingsService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    this.modalService.modal = this;

    this.modalService.activeModal$.subscribe((activeModal: ModalType) => {
      this.activeModal = activeModal;
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
    this._activeModal = modalName;

    this.cancellable = this.UNCANCELLABLE_MODALS.indexOf(modalName) === -1;

    this.visible = !! modalName;
  }

  close(evenIfUncancellable = false) {
    if (! this.cancellable && ! evenIfUncancellable) {
      return;
    }

    this.visible = false;

    // Can't remove activeModal immediately or it'll disappear while modal is fading, so wait a little.
    setTimeout(() => {
      this.activeModal = null;

      this.message = null;
    }, 1000);
  }

}
