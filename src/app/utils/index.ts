export * from './logger';
export * from './scroll-monitor.service';

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
  }
};
