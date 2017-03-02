import {Tag} from './';

// import * as _ from 'lodash';

/**
 * Public interface for Tag instances that can safely be manipulated by programmatic tags, and operate fine on the server as well.
 *
 * @TODO/prog Make PublicTagsService to pass to ProgTagApi which only returns PublicTags, and update relevant functions below
 * @TODO/prog Make PublicNote too, and PublicNotesService for that, etc.
 */
export class PublicTag {
  private _t: Tag;

  static READ_ONLY_PROPS = [
    '_logger',
    'id',
    'name',
    'created',
    'modified',
    'description',
    'docs',
    'noteCount',

    'prog',
    'fromLib',
    'childTagIds',
    'parentTagId',
    'childInclusiveDocs',

    'internal',
    'readOnly',
    // 'share',
    // 'sharedBy',
    'isDeleting',
  ];

  static WRITABLE_PROPS = [
    'customActions',
  ];

  static FUNCS = [
    'forDataStore',
    // 'updated', // nah let's take care of this ourselves
    'setData',
    'removeData',
    'getData',
    'rename',
    'delete',

    'goTo',
    // 'getNotes', // nah should return PublicNote
    // 'getChildInclusiveNotes', // ditto
    // 'getChildTags', // ditto
  ];

  constructor(tag: Tag) {
    Object.defineProperty(this, '_t', {
      value: tag,
      writable: false,
      enumerable: false,
      configurable: false,
    });
  }
}

PublicTag.READ_ONLY_PROPS.forEach((prop) => {
  Object.defineProperty(PublicTag.prototype, prop, {
    get: function() {
      return this._t[prop];
    },
    set: function(newVal) {
      throw new Error('Can\'t set read-only property "' + prop + '"');
    },
    enumerable: true,
    configurable: false,
  });
});
PublicTag.WRITABLE_PROPS.forEach((prop) => {
  Object.defineProperty(PublicTag.prototype, prop, {
    get: function() {
      return this._t[prop];
    },
    set: function(newVal) {
      this._t[prop] = newVal;
    },
    enumerable: true,
    configurable: false,
  });
});
PublicTag.FUNCS.forEach((func) => {
  PublicTag.prototype[func] = function() {
    return this._t[func].apply(this._t, arguments);
  }
});
