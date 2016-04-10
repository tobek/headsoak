export * from './logger';

export var utils = {
  objFromArray: function(arr: Array<any>) {
    if (!_.isArray(arr)) return arr;

    return _.extend({}, arr);
  }
};
