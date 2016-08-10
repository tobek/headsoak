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

  /** Whether this shortcut should be run in Angular's NgZone in order to do change detection, update view, etc. */
  ngZone: boolean;

  /** Our version of this.fn than wraps it with necessary checks. */
  private _fn: () => any;

  constructor(shortcutData: any, dataService: DataService) {
    super(shortcutData, dataService);
    _.extend(this, shortcutData); // see https://github.com/Microsoft/TypeScript/issues/1617

    this.type = 'string'; // force this for all shortcuts

    if (this.id === 'sNewNote') {
      console.log("YO BINDING", this.ngZone, shortcutData);
    }
    this._fn = () => {
      // @TODO/rewrite/shortcuts Do we want to block shortcuts under certain conditions (not logged in, in a blocking modal, etc.)?
      if (this.ngZone) {
        this.dataService.ngZone.run(this.fn);
      }
      else {
        this.fn();
      }
    };

    this.bindShortcut();
  }

  bindShortcut(): boolean {
    if (! this.fn) {
      return true; // let original keyboard event through
    }

    const binding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const bindFuncName = this.global ? 'bindGlobal' : 'bind';

    Mousetrap[bindFuncName](binding, this._fn);

    return false; // prevent keyboard event
  }

  updated(newVal: string): void {
    const oldBinding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const unbindFuncName = this.global ? 'unbindGlobal' : 'unbind';
    Mousetrap[unbindFuncName](oldBinding);

    super.updated(newVal);

    this.bindShortcut();
  }

}
