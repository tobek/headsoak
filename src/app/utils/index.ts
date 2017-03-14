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


/** Used for generating random IDs. */
const crypto: Crypto = window.crypto || window['msCrytpo'];
const cryptoNums = new Uint32Array(2);

export const utils = {
  objFromArray: function(arr: any[]) {
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
    let key = _.keys(obj).length; // best guess

    while (obj[key]) {
      key++;
    }

    return String(key);
  },

  placeCaretAtEnd(el: HTMLElement): void {
    el.focus();
    if (typeof window.getSelection !== 'undefined'
        && typeof document.createRange !== 'undefined') {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
    else if (typeof document.body['createTextRange'] !== 'undefined') {
      const textRange = document.body['createTextRange']();
      textRange.moveToElementText(el);
      textRange.collapse(false);
      textRange.select();
    }
  },

  /** Returns true if click went through, false if a click handler called preventDefault. */
  simulateClick(el: HTMLElement | Window): boolean {
    const event = new MouseEvent('click', {
      view: window,
      bubbles: true,
      cancelable: true
    });

    return el.dispatchEvent(event);
  },

  /** Not as random as a UUID (which has 122 bits of entropy) this has 64 bits of entropy. This is sufficient for our case (not to be used for uniqueness across all users, but just unique for this user). As worked out via birthday problem, there would be a 1-in-1000 chance of a single collision after generating about 200 million IDs, or a 1-in-a-million chance after generating ~6 million IDs. */
  randomId(): string {
    crypto.getRandomValues(cryptoNums);

    return cryptoNums[0].toString(36) + cryptoNums[1].toString(36);

    // @REMOVED Old version which was good cause it incorporated timestamp and base-36 for string shortness, but bad cause... it could generate collisions.
    // const microseconds = (performance.timing.navigationStart + performance.now()) * 1000;
    // return Math.floor((microseconds + Math.random()) * 1000).toString(36);
  },

  /** Not at all as random as `randomId`, as it's based on the number of microseconds since the app loaded, plus `Math.random`. Robust enough for session-specific stuff (you'd have to get the duplicate `Math.random` results in the same microsecond for a collision). The purpose of this is that it's faster than `randomId`, which can take about 1 millisecond on a phone. If you have 10k notes and need to create a random ID for each (in order to pass to web worker), then a 1 millisecond function call adds up. */
  sessionRandomId(): number {
    return performance.now() * 1000 + Math.random();
  }
};
