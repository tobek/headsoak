import {Injectable} from '@angular/core';

import {Logger, utils} from '../utils/';

import * as _ from 'lodash';

@Injectable()
export class UserService {
  loggedIn: boolean = false;
  displayNameSet: boolean;
  displayNamePlaceholder: string;

  uid: string;
  email: string;
  provider: string;
  displayName: string;
  lastLogin: number;

  /** Whether this user's data has undergone (second attempt at) migration of IDs from numbers to strings. True for new users. */
  idsMigrated2016: boolean;

  SAMPLE_DISPLAY_NAMES: Array<string> = ['Napoléon Bonaparte', 'Marco Polo', 'Nikola Tesla', 'Edgar Allan Poe', 'Florence Nightingale', 'Marilyn Monroe', 'Joan of Arc', 'Catherine the Great', 'Vlad the Impaler'];

  private _logger: Logger = new Logger(this.constructor.name);

  setData(userData: any) {
    _.extend(this, userData);

    if (userData.displayName) {
      this.displayNameSet = true; // silly tidbit for changing account dialog text
    }
    else {
      this.displayNamePlaceholder = 'e.g. ' + _.sample(this.SAMPLE_DISPLAY_NAMES);
    }

    this._logger.log('Data is now', this);
  }

  clear() {
    this.loggedIn = false;
    this.uid = null;
    this.email = null;
    this.provider = null;
  }
}
