import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import {SizeMonitorService} from '../utils/size-monitor.service';
import {Logger} from '../utils/';

import * as $ from 'jquery';
import * as _ from 'lodash';

// @TODO/optimization This should be run outside zone I think, it's triggering change detection on every check? Also maybe set up listener using `Observable`, see <http://stackoverflow.com/a/36849347/458614>
@Injectable()
export class ScrollMonitorService {
  lastScrollY = 0;
  newScrollY = 0;
  scroll$ = new Subject<number>();

  private desktopScrollingEl: Element;

  private throttledOnScroll = _.throttle(
    this.onScroll.bind(this),
    200,
    { leading: true, trailing: true }
  );

  private _logger: Logger = new Logger('ScrollMonitorService');

  constructor(
    private sizeMonitor: SizeMonitorService,
  ) {}

  init() {
    this.desktopScrollingEl = document.querySelector('main');
    this.desktopScrollingEl.addEventListener('scroll', this.throttledOnScroll);

    // On mobile:
    window.addEventListener('scroll', this.throttledOnScroll);

    this.lastScrollY = document.documentElement.scrollTop || document.body.scrollTop;
  }

  onScroll(event: Event) {
    if (event.currentTarget === this.desktopScrollingEl) {
      this.newScrollY = this.desktopScrollingEl.scrollTop;
    }
    else {
      this.newScrollY = document.documentElement.scrollTop || document.body.scrollTop;
    }

    this.scroll$.next(this.newScrollY);

    this.lastScrollY = this.newScrollY;
  }

  scrollTo(scrollTop: number, duration = 250, modal?: boolean) {
    let $target;

    if (modal) {
      $target = jQuery('modal');
    }
    else {
      $target = jQuery(this.sizeMonitor.isMobile ? 'html, body' : 'main');
    }

    $target.animate({ scrollTop: scrollTop }, duration);
  }

  scrollToTop(duration = 250, modal?: boolean) {
    this.scrollTo(0, duration, modal);
  }

  ensureElVisibleInScrollable(el: JQuery | HTMLElement | string, duration = 250) {
    const $el = $(el);

    if (! $el.length) {
      this._logger.warn('No element found for', el, '- can\'t ensure visibility in scrollable parent');
      return;
    }

    const $parent = $el.offsetParent();

    const topFromTop = $el.position().top; // How far top of el is from top of current tag list scroll position
    const bottomFromTop = $el.position().top + $el.outerHeight() + 50; // How far bottom of el is from top of current tag list scroll position
    // haha

    if (topFromTop < 0) {
      // Top of $el isn't visible - scroll up so it is:
      $parent.animate({ scrollTop: $parent.scrollTop() + topFromTop }, duration);
    }
    else if (bottomFromTop > $parent.height()) {
      // Bottom of $el isn't visible - scroll down so it is:
      $parent.animate({ scrollTop: $parent.scrollTop() + (bottomFromTop - $parent.height()) }, duration);
    }
  }

}
