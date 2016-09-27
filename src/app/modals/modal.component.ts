import {Component/*, ViewChild*/, HostBinding} from '@angular/core';
// import {Subscription} from 'rxjs';

import {ModalService} from './modal.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Logger} from '../utils/logger';

import {FeedbackComponent} from './feedback.component';


type ModalType = null | 'feedback' | 'login';

@Component({
  selector: 'modal',
  pipes: [ ],
  providers: [ ],
  directives: [
    FeedbackComponent
  ],
  templateUrl: './modal.component.html'
})
export class ModalComponent {
  // @ViewChild(NoteComponent) noteComponent: NoteComponent;

  @HostBinding('class.on') visible = false;

  _activeModal: ModalType;

  // private noteUpdatedSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public modalService: ModalService,
    public analyticsService: AnalyticsService,
    public settings: SettingsService
   ) {}

  ngOnInit() {
    this._logger.log('Component initializing');

    this.modalService.modal = this;
  }

  /** Not sure why this would ever happen as this is a singleton service that's always around, just visible or not visible, but putting this here anyway. */
  ngOnDestroy() {
    // this.noteUpdatedSub.unsubscribe();

    if (this.modalService.modal === this) {
      this.modalService.modal = null;
    }
  }

  get activeModal(): ModalType {
    return this._activeModal;
  }
  set activeModal(modalName: ModalType) {
    this._activeModal = modalName;

    this.visible = !! modalName;
  }

  close() {
    this.visible = false;

    // Can't remove activeModal immediately or it'll disappear while modal is fading, so wait a little.
    setTimeout(() => {
      this.activeModal = null;
    }, 1000);
  }

}
