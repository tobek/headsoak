import {DataService} from '../';

import {Setting} from './';

export class Shortcut extends Setting {
  fn: Function;

  /** Work even in text input areas without "mousetrap" class. */
  global = true;

  /** Do not add the global `mod` to binding. */
  noMod = false;

  constructor(shortcutData: any, dataService: DataService) {
    super(shortcutData, dataService);

    this.type = 'string'; // force this for all shortcuts
  }

}
