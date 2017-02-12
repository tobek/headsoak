import {NavigationEnd} from '@angular/router';

import {DataService} from '../data.service';

import {Setting} from './';

import * as _ from 'lodash';

export class Shortcut extends Setting {
  static VALID_MOD_KEYS = ['ctrl', 'shift', 'alt', 'option', 'meta', 'mod', 'command'];

  /** Shortcut binding. Will be combined with global modifier key setting `sMod` (unless `noMod`) and passed directly to Mousetrap - see Mousetrap docs for more info. */
  value: string;

  /** The function that gets run when this shortcut is used. */
  fn: () => any;

  /** Work even in text input areas without "mousetrap" class. */
  global = true;

  /** Do not add the global `mod` to binding. Currently not supported in the UI and only used for internal/overkill shortcuts. */
  noMod = false;

  /** What kind of key event we should listen for: 'keyup' | 'keydown' | 'keypress' */
  keyEvent: string;

  /** Whether preventDefault() should be called on the key event handler. */
  preventDefault = true;

  /** Whether this shortcut's function should be run in Angular's NgZone in order to do change detection, update view, etc. */
  ngZone = false;

  /** If set, identifies the routes that this shortcut's function must be run in. If not already in one of these routes, this will navigate to the first route and then execute the function. */
  routeTo: string[];
  /** If set, this shortcut should only do anything on the specified route(s), and otherwise do nothing. */
  onlyOnRoutes: string[];

  /** Our version of this.fn than wraps it with necessary checks. */
  private _fn: () => any;
  private _routedFn: () => any;
  private _zonedFn: () => any;

  constructor(shortcutData: any, dataService: DataService) {
    super(shortcutData, dataService);
    _.extend(this, shortcutData); // see https://github.com/Microsoft/TypeScript/issues/1617

    if (this.routeTo && this.onlyOnRoutes) {
      throw Error('Shortcut with `routeTo` and `onlyOnRoute` is ambiguous - must specify no more than 1.');
    }
    else if (this.routeTo && ! this.routeTo.length) {
      throw Error('If `routeTo` is specified, at least one route must be provided');
    }
    else if (this.onlyOnRoutes && ! this.onlyOnRoutes.length) {
      throw Error('If `onlyOnRoutes` is specified, at least one route must be provided');
    }

    this.type = 'string'; // force this for all shortcuts

    if (this.routeTo) {
      this._routedFn = () => {
        if (_.includes(this.routeTo, this.dataService.router.url)) {
          this.fn();
        }
        else {
          this.dataService.router.events
            .filter(event => event instanceof NavigationEnd)
            .first().subscribe((event) => {
            // Changing route requires we run in ngZone after route change, regardless of the this.ngZone setting
            this.dataService.zone.run(() => {
              // And for some reason it still doesn't always work (specifically `sSearch` shortcut)
              setTimeout(this.fn, 0);
            });
          });

          this.dataService.router.navigateByUrl(this.routeTo[0]);
        }
      };
    }
    else if (this.onlyOnRoutes) {
      this._routedFn = () => {
        if (_.includes(this.onlyOnRoutes, this.dataService.router.url)) {
          this.fn();
        }
      };
    }
    else {
      this._routedFn = this.fn;
    }


    if (this.ngZone) {
      this._zonedFn = () => {
        if (this.routeTo && ! _.includes(this.routeTo, this.dataService.router.url)) {
          // No need to wrap in ngZone because the function is about to route to somewhere new, wait til routing is completed, and then has to run in ngZone anyway:
          this._routedFn();
        }
        else {
          // No routing is happening, so gotta do in the zone:
          this.dataService.zone.run(this._routedFn);
        }
      };
    }
    else {
      this._zonedFn = this._routedFn;
    }

    // @TODO/rewrite/shortcuts Do we want to block shortcuts under certain conditions (not logged in, in a blocking modal, etc.)?

    this._fn = this._zonedFn;

    this.bindShortcut();
  }

  bindShortcut(): boolean {
    if (! this.fn) {
      return true; // let original keyboard event through
    }

    const binding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const bindFuncName = this.global ? 'bindGlobal' : 'bind';

    Mousetrap[bindFuncName](binding, this._fn, this.keyEvent || undefined);

    return ! this.preventDefault;
  }

  updated(newVal = this.value as any): void {
    // Argument of type `any` otherwise typescript complains cause it doesn't jive with Setting.updated signature. But it should be a string, see:
    if (typeof newVal !== 'string') {
      throw new Error('Invalid setting for shortcut ' + this.id + ': ' + JSON.stringify(newVal));
    }
    
    const oldBinding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const unbindFuncName = this.global ? 'unbindGlobal' : 'unbind';
    Mousetrap[unbindFuncName](oldBinding);

    super.updated(newVal);

    this.bindShortcut();
  }

}
