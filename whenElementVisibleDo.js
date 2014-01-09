/*
 * example invocation:
 * whenElementVisibleDo(document.getElementById('some_id'), function(){ console.log('visible now!'); });
 */

// performs callback when element becomes visible, then removes listeners
function whenElementVisibleDo(el, cb) {
  var handler = function() {
    if (isElementInViewportAtAll(el)) {
      cb();
      removeListeners(handler);
    }
  }
  attachListeners(handler);
}

// similar to http://stackoverflow.com/a/7557433/458614 but returns true if any part of the element is in the viewport, not just the whole thing
// should work on: Chrome, Firefox, Safari, IE8+, iOS Safari, Android2+, Blackberry, Opera Mobile, IE Mobile
// doesn't handle z-index, being outside of viewable area of parent element, and possibly other edge cases
// we check if either the top OR the bottom of the element is within the viewport, while either the left right or the element is also in the viewport
function isElementInViewportAtAll (el) {
    var rect = el.getBoundingClientRect();
    var height = window.innerHeight || document.documentElement.clientHeight;
    var width = window.innerWidth || document.documentElement.clientWidth;
    return (
      (
        (rect.top <= height && rect.top >= 0) ||
        (rect.bottom <= height && rect.bottom >= 0)
      ) &&
      (
        (rect.left <= width && rect.left >= 0) ||
        (rect.right <= width && rect.right >= 0)
      ) 
    );
}

function attachListeners(fn) {
  if (window.addEventListener) {
    window.addEventListener('DOMContentLoaded', fn, false);
    window.addEventListener('load', fn, false);
    window.addEventListener('scroll', fn, false);
    window.addEventListener('resize', fn, false);
  } else if (window.attachEvent) { // IE fallback
    window.attachEvent('DOMContentLoaded', fn);
    window.attachEvent('load', fn);
    window.attachEvent('onscroll', fn);
    window.attachEvent('onresize', fn);
  }
}
function removeListeners(fn) {
  if (window.removeEventListener) {
    window.removeEventListener('DOMContentLoaded', fn, false);
    window.removeEventListener('load', fn, false);
    window.removeEventListener('scroll', fn, false);
    window.removeEventListener('resize', fn, false);
  } else if (window.attachEvent) { // IE fallback
    window.detachEvent('DOMContentLoaded', fn);
    window.detachEvent('load', fn);
    window.detachEvent('onscroll', fn);
    window.detachEvent('onresize', fn);
  }
}