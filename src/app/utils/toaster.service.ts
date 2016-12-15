import {Injectable} from '@angular/core';
// import {SafeHtml} from '@angular/platform-browser';

/** See https://github.com/CodeSeven/toastr for docs on the Toastr library. */
@Injectable()
export class ToasterService {

  private _toaster = require('toastr');

  constructor(
  ) {
    this._toaster.options = {
      toastClass: 'toast', // if you override this you must also include `toast` or styles will break
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

  toast(method: 'success' | 'info' | 'warning' | 'error', text: string, titleOrOpts?: string | Object, opts?: Object): void {
    let title;

    if (opts) {
      // All parameters supplied: text, then title, then opts
      title = titleOrOpts;
      this._toaster[method](text, title, opts);
    }
    else if (titleOrOpts) {
      // Two params supplied, either text then title, or text then opts
      if (typeof titleOrOpts === 'string') {
        title = titleOrOpts;
        this._toaster[method](text, title);
      }
      else {
        opts = titleOrOpts;
        // When using text alone let's show it as the bolder "title" - second param
        this._toaster[method](undefined, text, opts);
      }
    }
    else {
      this._toaster[method](undefined, text);
    }
  }

  success(text: string, titleOrOpts?: string | Object, opts?: Object): void {
    this.toast('success', text, titleOrOpts, opts);
  }
  info(text: string, titleOrOpts?: string | Object, opts?: Object): void {
    this.toast('info', text, titleOrOpts, opts);
  }
  warning(text: string, titleOrOpts?: string | Object, opts?: Object): void {
    this.toast('warning', text, titleOrOpts, opts);
  }
  error(text: string, titleOrOpts?: string | Object, opts?: Object): void {
    this.toast('error', text, titleOrOpts, opts);
  }
}
