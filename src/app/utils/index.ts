export * from './logger';

export var utils = {
  objFromArray: function(arr: Array<any>) {
    if (!_.isArray(arr)) return arr;

    return _.extend({}, arr);
  },

  /** firebase paths can't contain: ".", "#", "$", "[", or "]" */
  formatForFirebase: function(s: string): string {
    // just base64 encode it eh
    return btoa(s);
  },
};
