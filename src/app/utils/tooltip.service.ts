import {Injectable} from '@angular/core';

const Tooltips = require('app/vendor/darsain-tooltips.js');

@Injectable()
export class TooltipService {

  private _tips;

  constructor(
  ) {
  }

  init() {
    this._tips = new Tooltips(document.body, {
      tooltip:    {
        auto: true, // automatically position if it would go off screen
        effectClass: 'fade',
      },
      key: 'tooltip', // `data-tooltip` attribute triggers tooltip
      showOn: 'mouseenter',
      hideOn: 'mouseleave',
      observe: 1 // enable mutation observer (used only when supported - need to apply tooltips to newly generated elements.)
    });
  }

}
