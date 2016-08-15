import {NavigationEnd} from '@angular/router';

import {DataService} from '../';

import {Setting} from './';

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

  /** If set, identifies the route that this shortcut's function must be run in. If not already in that route, this will navigate there and then execute the function. */
  routeTo: string;
  /** If set, this shortcut should only do anything on the specified route, and otherwise do nothing. */
  onlyOnRoute: string;

  /** Our version of this.fn than wraps it with necessary checks. */
  private _fn: () => any;
  private _routedFn: () => any;
  private _zonedFn: () => any;

  constructor(shortcutData: any, dataService: DataService) {
    super(shortcutData, dataService);
    _.extend(this, shortcutData); // see https://github.com/Microsoft/TypeScript/issues/1617

    if (this.routeTo && this.onlyOnRoute) {
      throw Error('Shortcut with `routeTo` and `onlyOnRoute` is ambiguous - must specify no more than 1.');
    }

    this.type = 'string'; // force this for all shortcuts

    if (this.routeTo) {
      this._routedFn = () => {
        if (this.dataService.router.url === this.routeTo) {
          this.fn();
        }
        else {
          this.dataService.router.events
            .filter(event => event instanceof NavigationEnd)
            .first().subscribe((event) => {
            // Changing route requires we run in ngZone after route change, regardless of the this.ngZone setting
            this.dataService.ngZone.run(() => {
              // And for some reason it still doesn't always work (specifically `sSearch` shortcut)
              setTimeout(this.fn, 0);
            });
          });

          this.dataService.router.navigateByUrl(this.routeTo);
        }
      };
    }
    else if (this.onlyOnRoute) {
      this._routedFn = () => {
        if (this.dataService.router.url === this.onlyOnRoute) {
          this.fn();
        }
      };
    }
    else {
      this._routedFn = this.fn;
    }


    if (this.ngZone) {
      this._zonedFn = () => {
        if (this.routeTo && this.dataService.router.url !== this.routeTo) {
          // No need to wrap in ngZone because the function is about to route to somewhere new, wait til routing is completed, and then has to run in ngZone anyway:
          this._routedFn();
        }
        else {
          // No routing is happening, so gotta do in the zone:
          this.dataService.ngZone.run(this._routedFn);
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

  updated(newVal?: string): void {
    const oldBinding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const unbindFuncName = this.global ? 'unbindGlobal' : 'unbind';
    Mousetrap[unbindFuncName](oldBinding);

    super.updated(newVal);

    this.bindShortcut();
  }

}
