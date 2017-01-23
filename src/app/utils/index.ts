import * as _ from 'lodash';

export * from './autocomplete.service';
export * from './size-monitor.service';
export * from './scroll-monitor.service';
export * from './syntax.service';
export * from './toaster.service';
export * from './tooltip.service';

export * from './empty.component';
export * from './force-graph.component';
export * from './fuzzy-match-sorter';
export * from './jquery.autocomplete.mod';
export * from './logger';
export * from './sample-data';

export var utils = {
  objFromArray: function(arr: Array<any>) {
    if (typeof arr === 'object') {
      return arr;
    }
    else if (! _.isArray(arr)) {
      throw new Error('objFromArray requires an array!');
    }

    return _.extend({}, arr);
  },

  /** Firebase paths can't contain: ".", "#", "$", "[", or "]" */
  formatForFirebase: function(s: string): string {
    // just base64 encode it eh
    return btoa(s);

    // @TODO/rewrite The above won't work for encoding unicode. However, Firebase keys *can* contain unicode so we don't have to. All we need is this:
    // return encodeURIComponent(s).replace(/\./g, '%2E');
    // and the decode:
    // return decodeURIComponent(s.replace('%2E', '.'));
    // They should be called encodeAsFirebaseKey and decodeFirebaseKey
    // Existing emailToId keys should be changed
  },

  /** Finds a key not currently in given object. */
  getUnusedKeyFromObj: function(obj: Object): string {
    var key = _.keys(obj).length; // best guess

    while (obj[key]) {
      key++;
    }

    return String(key);
  },

  placeCaretAtEnd(el: HTMLElement): void {
    el.focus();
    if (typeof window.getSelection !== 'undefined'
        && typeof document.createRange !== 'undefined') {
      var range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    else if (typeof document.body['createTextRange'] !== 'undefined') {
      var textRange = document.body['createTextRange']();
      textRange.moveToElementText(el);
      textRange.collapse(false);
      textRange.select();
    }
  },

  /** Returns true if click went through, false if a click handler called preventDefault. */
  simulateClick(el: HTMLElement | Window): boolean {
    const event = new MouseEvent('click', {
      'view': window,
      'bubbles': true,
      'cancelable': true
    });

    return el.dispatchEvent(event);
  },
};
