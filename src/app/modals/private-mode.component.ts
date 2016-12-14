import {Component, ViewChild, Input, ElementRef/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {ModalService} from './modal.service';

import {TooltipService} from '../utils/';
import {Logger} from '../utils/logger';


@Component({
  selector: 'private-mode',
  providers: [ ],
  templateUrl: './private-mode.component.html'
})
export class PrivateModeComponent {

  password = '';
  
  isLoading = false;

  @Input('isModal') isModal?: boolean;

  @ViewChild('passwordInput') passwordInput: ElementRef;

  // @HostBinding('class.on') visible = false;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    public analyticsService: AnalyticsService,
    public dataService: DataService,
    private tooltipService: TooltipService,
    private modalService: ModalService,
   ) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    setTimeout(() => {
      if (this.passwordInput) {
        this.passwordInput.nativeElement.focus();
      }
    }, 100);
  }

  ngOnDestroy() {
  }

  enable(): void {
    if (! this.password) {
      return;
    }

    this._logger.log('Enabling private mode');

    this.isLoading = true;

    this.dataService.accountService.checkPassword(this.password, (error) => {
      this.isLoading = false;

      if (error) {
        this._logger.warn('Failed to enable private mode');
        this.tooltipService.justTheTip(error, this.passwordInput.nativeElement, 'error');
        return;
      }

      this.dataService.accountService.enablePrivateMode(); // triggers toaster
      this.password = '';

      if (this.isModal) {
        // @TODO/polish Here and in disable, can we close modal before switching it on? Cause the form UI updates just as the modal closes and it looks clunky. If we delay turning it on until after modal fades, however, then private notes won't instantly show up.
        this.modalService.close();
      }
    });

  }

  disable(): void {
    this.dataService.accountService.disablePrivateMode(); // triggers toaster

    if (this.isModal) {
      this.modalService.close();
    }
  }

}
