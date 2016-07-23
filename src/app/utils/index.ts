export * from './autocomplete.service';
export * from './fuzzy-match-sorter';
export * from './jquery.autocomplete.mod';
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
  },

  arrayIntersect: function(a1, a2) {
    return a1.filter(function(n) {
      return a2.indexOf(n) !== -1;
    });
  },
  // takes array of arrays
  multiArrayIntersect: function(arrays) {
    if (! arrays.length) return [];
    else {
      var soFar = arrays[0].slice(); // start with the 0th. slice() to duplicate array, otherwise in the case of arrays.length==1 we end up returning a reference to that array
      for (var i = 1; i < arrays.length; i++) { // then with the first
        soFar = utils.arrayIntersect(soFar, arrays[i]);
      };
      return soFar;
    }
  }
};
