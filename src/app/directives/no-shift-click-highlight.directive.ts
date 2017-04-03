import {Directive, HostListener} from '@angular/core';

/**
 * This directive prevents shift+clicking on an element from highlighting text between current focus position and where you clicked.
 */
@Directive({
  selector: '[noShiftClickHighlight]'
})
export class NoShiftClickHighlightDirective {
  constructor() {}

  @HostListener('mousedown', ['$event']) onMousedown(event: MouseEvent) {
    if (event.shiftKey) {
      event.preventDefault();
    }
  }
}
