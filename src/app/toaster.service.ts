import {Injectable} from '@angular/core';
// import {SafeHtml} from '@angular/platform-browser';

@Injectable()
export class ToasterService {

  private _toaster = require('toastr');

  constructor(
  ) {
    this._toaster.options = {
      closeButton: false,
      debug: false,
      newestOnTop: false,
      progressBar: true,
      positionClass: 'toast-bottom-left',
      preventDuplicates: false,
      onclick: null,
      showDuration: 300,
      hideDuration: 1000,
      timeOut: 5000,
      extendedTimeOut: 1000,
      showEasing: 'swing',
      hideEasing: 'linear',
      showMethod: 'fadeIn',
      hideMethod: 'fadeOut',
    }
  }

  success(text: string, title?: string) {
    this._toaster.success(text, title);
  }
  info(text: string, title?: string) {
    this._toaster.info(text, title);
  }
  warning(text: string, title?: string) {
    this._toaster.warning(text, title);
  }
  error(text: string, title?: string) {
    this._toaster.error(text, title);
  }
}
