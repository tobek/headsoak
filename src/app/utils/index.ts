export * from './logger';

export var utils = {
  objFromArray: function(arr: Array<any>) {
    if (!_.isArray(arr)) return arr;

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
