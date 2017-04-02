import {Directive, ElementRef, Input, EventEmitter, HostListener} from '@angular/core';

import {ScrollMonitorService} from '../utils/';

import * as jQuery from 'jquery';

/**
 * This directive sets up a click handler that animates scrolling to the first element identified by the given selector.
 *
 * `[animateToSelector]` is passed to `jQuery`, so pseudo selectors such as `:visible` are supported.
 */
@Directive({
  selector: '[animateToSelector]'
})
export class AnimateToSelectorDirective {
  @Input() animateToSelector: string;

  constructor(
    private scrollMonitor: ScrollMonitorService,
  ) {}

  @HostListener('click', ['$event']) onClick(event: MouseEvent) {
    const $el = jQuery(this.animateToSelector);

    if (! $el.length) {
      throw new Error('Cannot animate to "' + this.animateToSelector + '" - no element found by that selector');
    }

    this.scrollMonitor.scrollTo($el.first().position().top, undefined, true);
  }
}
