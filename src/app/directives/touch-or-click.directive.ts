import {Directive, ElementRef, Output, EventEmitter, HostListener} from '@angular/core';

/**
 * This directive lets you bind an event to either touch or click. If a touchend event is registered, then the click event that mobile browsers emulate will NOT be fired, via `event.preventDefault()`. This prevents things like active/hover state being applied to the element (and, for example, popping up a tooltip).
 *
 * Using `touchend` means that if the user starts scrolling on a component with this directive, then when they're done and lift up, the handler still fires. Could be odd but not that crazy. If we use `touchstart` instead, we also simply all scrolling that starts from that point - since there isn't much room on the screen on mobile let's not take this away from the user.
 *
 * Tried using `hammerjs`'s `tap` event but that didn't let us preventDefault. Another option specifically for preventing tooltips from firing would be to do something like add `data-tooltip-type="not-on-mobile"` and style that class to hide it on mobile, but that's not a very nuanced way to handle touch, and doesn't prevent spurious hover states.
 *
 * @TODO/QA Test this on various mobile devices 
 */
@Directive({
  selector: '[touchOrClick]'
})
export class TouchOrClick {
  @Output('touchOrClick') output = new EventEmitter<{ event: Event, wasClick?: boolean }>();

  constructor(
    private elRef: ElementRef
  ) {
  }

  @HostListener('click', ['$event']) onClick(event: MouseEvent) {
    // console.log('clicked!', event);
    this.output.emit({ event: event, wasClick: true });
  }

  @HostListener('touchend', ['$event']) onTouchend(event: TouchEvent) {
    // console.log('touch ended! preventing default:', event.cancelable, event);
    if (event.cancelable) {
      event.preventDefault();
    }

    this.output.emit({ event: event });
  }
}