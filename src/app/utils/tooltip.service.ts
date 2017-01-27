import {Injectable} from '@angular/core';

import {SizeMonitorService} from '../utils/';

import * as Tooltips from '../vendor/darsain-tooltips';

@Injectable()
export class TooltipService {

  private _tips;

  constructor(
    private sizeMonitorService: SizeMonitorService,
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
      observe: 1 // enable mutation observer (used only when supported - need to apply tooltips to newly generated elements.) @TODO Tooltips library uses dataset which doesn't exist on SVG elements so this library throws an error when mutation observer hits SVG and tries to bind tooltips, see issue https://github.com/darsain/tooltips/issues/14. Apart from ugly error in console, this may prevent tooltips from working, presumably if a tooltip attribute shows up after any SVG element as part of same DOM transformation.
    });
  }

  closeTooltip(event: Event) {
    this._tips.hide(event.currentTarget);
  }

  /** Destroys and re-creates tooltip associated with an element. This is needed for tooltips whose `data-tooltip` attributes are dynamic - once the tooltip is created, it doesn't update when the attribute updates, so we need to do this. It's kind of a hack. */
  reloadTooltip(el: HTMLElement) {
    return this._tips.remove(el).add(el);
  }

  reloadOnEvent(event: MouseEvent, show = false, timeout = 0) {
    // When Angular updates the DOM it seems like event.currentTarget gets set to null, but assigning it here let's us continue to reference it.
    const el = <HTMLElement> event.currentTarget;

    // Wait for DOM to update
    setTimeout(() => {
      this.reloadTooltip(el);

      // Check if document contains element cause it may have since been removed in which case tooltip appears at top left of page and won't go away.
      // If we're on mobile, don't re-show it, because it won't go away until tapping elsewhere, cause there's no mouseleave.
      if (show && document.body.contains(el) && ! this.sizeMonitorService.isMobile) {
        this._tips.show(el);
      }
    }, timeout);
   }

  reloadOnClick(event: MouseEvent) {
    // Show tooltip right away cause they just mouse clicked so mouse is still on it
    this.reloadOnEvent(event, true);
  }

  /** E.g. to attach to dynamic tooltip with `(mouseleave)="tooltipService.reloadOnMouseleave($event)"`. */
  reloadOnMouseleave(event: MouseEvent) {
    // Wait for fade animation before reloading tooltip
    this.reloadOnEvent(event, false, 500);
  }

  /**
    * Spawns one tooltip with given content on given element. Any user activity on the page (click, touch, keyboard) will make the tooltip disappear.
    *
    * By default, tooltip won't fade automatically unless it's a `success` tooltip, in which case it starts to fades in 5000ms. (Pass explicit `null` to `autoFadeTimeout` to prevent automatic fade out for `success` tooltips.) */
  justTheTip(content: string, el: HTMLElement, typeClass?: 'success' | 'info' | 'warning' | 'error', autoFadeTimeout?: number, placement?: string) {
    if (typeof placement === 'undefined') {
      placement = 'top-right';
      if (el['type'] === 'submit' || el.nodeName.toLowerCase() === 'button') {
        placement = 'top';
      }
    }

    const tip = new Tooltips.Tooltip(content, {
      typeClass: typeClass,
      place: placement,
      effectClass: 'fade',
      auto: true,
    }).show(el);

    const offFunc = function() {
      tip.hide();
      setTimeout(function() {
        tip.destroy();
      }, 1000);

      jQuery(window).off('mousedown touchstart keydown', offFunc);
    }
    jQuery(window).on('mousedown touchstart keydown', offFunc);

    // Success tooltips fade away on their own by default
    if (typeClass === 'success' && typeof autoFadeTimeout === 'undefined') {
      autoFadeTimeout = 5000;
    }
    
    if (typeof autoFadeTimeout !== 'undefined' && autoFadeTimeout !== null) {
      setTimeout(function() {
        jQuery(tip.element).fadeOut(2000);
        // We can still leave the event handler above to actually dispose of the tooltip instance
      }, autoFadeTimeout);
    }
  }

}
