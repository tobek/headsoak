import {Injectable} from '@angular/core';
// import {SafeHtml} from '@angular/platform-browser';

interface ToasterOptions {
  /** If you override `toastClass` you must also include `'toast'` or styles will break. */
  toastClass?: string;
  closeButton?: boolean;
  debug?: boolean;
  newestOnTop?: boolean;
  progressBar?: boolean;
  positionClass?: string;
  preventDuplicates?: boolean;
  showDuration?: number;
  hideDuration?: number;
  timeOut?: number;
  extendedTimeOut?: number;
  showEasing?: string;
  hideEasing?: string;
  showMethod?: string;
  hideMethod?: string;
  /** Adding `onclick` handler makes `closeButton` enabled by default unless explicitly disabled. */
  onclick?: () => void;
  onShown?: () => void;
  onHidden?: () => void;
  onCloseClick?: () => void;
}

export interface Toast extends JQuery {
  el: HTMLElement;
  close: () => void;
}

/** See https://github.com/CodeSeven/toastr for docs on the Toastr library. */
@Injectable()
export class ToasterService {

  static DEFAULT_OPTIONS = {
    toastClass: 'toast',
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
    extendedTimeOut: 5000,
    showEasing: 'swing',
    hideEasing: 'linear',
    showMethod: 'fadeIn',
    hideMethod: 'fadeOut',
  };

  private _toaster = require('toastr');

  constructor(
  ) {
    this._toaster.options = ToasterService.DEFAULT_OPTIONS;
  }

  toast(method: 'success' | 'info' | 'warning' | 'error', text: string, titleOrOpts?: string | ToasterOptions, opts?: ToasterOptions): Toast {
    let title;

    if (opts) {
      // All parameters supplied: text, then title, then opts
      title = titleOrOpts;
    }
    else if (titleOrOpts) {
      // Two params supplied, either text then title, or text then opts
      if (typeof titleOrOpts === 'string') {
        title = titleOrOpts;
      }
      else {
        opts = titleOrOpts;
      }
    }

    if (! title) {
      // When using text alone let's show it as the bolder "title"
      title = text;
      text = undefined;
    }

    if (opts && opts.onclick && ! ('closeButton' in opts)) {
      opts.closeButton = true;
    }

    const $toastEl = this._toaster[method](text, title, opts);

    $toastEl.el = $toastEl[0];
    $toastEl.close = this.closeToast;

    return $toastEl;
  }

  success(text: string, titleOrOpts?: string | ToasterOptions, opts?: ToasterOptions): Toast {
    return this.toast('success', text, titleOrOpts, opts);
  }
  info(text: string, titleOrOpts?: string | ToasterOptions, opts?: ToasterOptions): Toast {
    return this.toast('info', text, titleOrOpts, opts);
  }
  warning(text: string, titleOrOpts?: string | ToasterOptions, opts?: ToasterOptions): Toast {
    return this.toast('warning', text, titleOrOpts, opts);
  }
  error(text: string, titleOrOpts?: string | ToasterOptions, opts?: ToasterOptions): Toast {
    return this.toast('error', text, titleOrOpts, opts);
  }

  /** This is called bound to what Toastr returns, which is a jQuery object containing the toast element. */
  closeToast() {
    const $closeButton = (this as any as JQuery).find('.toast-close-button');
    if ($closeButton.length) {
      $closeButton.trigger('click');
    }
    else {
      (this as any as JQuery).trigger('click');
    }
  }
}
