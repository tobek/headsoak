export * from './autocomplete.service';
export * from './fuzzy-match-sorter';
export * from './jquery.autocomplete.mod';
export * from './logger';
export * from './scroll-monitor.service';
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
    if (typeof window.getSelection != 'undefined'
        && typeof document.createRange != 'undefined') {
      var range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    else if (typeof document.body['createTextRange'] != 'undefined') {
      var textRange = document.body['createTextRange']();
      textRange.moveToElementText(el);
      textRange.collapse(false);
      textRange.select();
    }
  }
};
