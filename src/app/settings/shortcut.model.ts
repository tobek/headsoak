import {DataService} from '../';

import {Setting} from './';

export class Shortcut extends Setting {
  static VALID_MOD_KEYS = ['ctrl', 'shift', 'alt', 'option', 'meta', 'mod', 'command'];

  /** Shortcut binding. Will be combined with global modifier key setting `sMod` (unless `noMod`) and passed directly to Mousetrap - see Mousetrap docs for more info. */
  value: string;

  /** The function that gets run when this shortcut is used. */
  fn: Function;

  /** Work even in text input areas without "mousetrap" class. */
  global = true;

  /** Do not add the global `mod` to binding. Currently not supported in the UI and only used for internal/overkill shortcuts. */
  noMod = false;

  constructor(shortcutData: any, dataService: DataService) {
    super(shortcutData, dataService);

    this.type = 'string'; // force this for all shortcuts

    this.bindShortcut();
  }

  bindShortcut(): boolean {
    if (! this.fn) {
      return true; // let original keyboard event through
    }

    const binding = this.noMod ? this.value : this.dataService.settings['sMod'] + '+' + this.value;
    const bindFuncName = this.global ? 'bindGlobal' : 'bind';

    // @TODO/rewrite/shortcuts Do we want to block shortcuts under certain conditions (not logged in, in a blocking modal, etc.)? If so we can wrap `this.fn` with some logic. Also we used to have an `apply` property for having to run angular scope apply - might need something similar.
    Mousetrap[bindFuncName](binding, this.fn);

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
