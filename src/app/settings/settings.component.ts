import {Component, ViewChildren/*, QueryList*/, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';

import {Logger} from '../utils/';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';
import {SettingsService} from './settings.service';
import {Setting, Shortcut} from './';

import {SettingComponent} from './setting.component';
import {FeedbackComponent} from '../modals/feedback.component';
import {PrivateModeComponent} from '../modals/private-mode.component';

@Component({
  selector: 'settings',
  directives: [
    SettingComponent,
    FeedbackComponent,
    PrivateModeComponent,
  ],
  template: require('./settings.component.html')
})
export class SettingsComponent implements OnInit {
  section: string;
  // Currently supported sections:
  SECTION_NAME_MAP = {
    settings: 'Settings',
    shortcuts: 'Shortcuts',
    account: 'Account',
    feedback: 'Feedback',
    privateMode: 'Private Mode',
  };

  initialized = false;

  // @ViewChildren(SettingComponent) settingComponents: QueryList<SettingComponent>;

  private emailAddress: string = '';
  private oldPass: string = '';
  private newPass: string = '';

  private syncDebounced = _.debounce(this.dataService.sync.bind(this.dataService), 1000);
  private checkEmptyModKeyDebounced = _.debounce(this.checkEmptyModKey.bind(this), 1000);

  private modKeyError = '';

  private displayedSettings: Setting[] = [];

  private routeDataSub: Subscription;

  private _logger = new Logger(this.constructor.name);

  constructor(
    private route: ActivatedRoute,
    private modalService: ModalService,
    private settings: SettingsService,
    private dataService: DataService
  ) {
  }

  ngOnInit() {
    this.routeDataSub = this.route.data.subscribe((data) => {
      this.section = data['slug'];
    });

    // Will fire immediately if already initialized, otherwise will wait for initialization and then fire. Either way, will unsubscribe immediately after.
    this.settings.initialized$.first().subscribe(this.init.bind(this));
  }

  ngOnDestroy() {
    this.routeDataSub.unsubscribe();
  }

  init(): void {
    this._logger.log('`Settings` component initialized');

    this.displayedSettings = _.filter(this.settings.data, (setting) => {
      return setting.section === this.section && ! setting.overkill && ! setting.internal;
    });

    this.initialized = true;

    if (this.section === 'shortcuts') {
      this.checkEmptyModKey();
    }
    else if (this.section === 'account') {
      this.emailAddress = this.dataService.user.email;
    }
  }

  /** Trying to pass args directly from SettingComponent to here - seemingly can't use ES6 splats/parameter magic in template, and had some issues with `this`, so this is where we ended up. */
  settingUpdatedProxy(args){
    this.settingUpdated.apply(this, args);
  }

  settingUpdated(setting: Setting | Shortcut, newVal?: any): void {
    if (! this.modKeyCheck(setting)) {
      return;
    }

    if (setting instanceof Shortcut && setting.value === '' && setting.id !== 'sMod') {
      this.settings.set(setting.id, setting.default);
      return;
    }

    // @TODO/rewrite/settings We should check for duplicate shortcuts here. Ideally we can have a per-setting place for errors (and the modless issue should be shown there).

    setting.updated(newVal);

    this.syncDebounced(); // Digest sync is 5s which is a bit long if user is sitting there waiting for setting to save

    this.checkEmptyModKeyDebounced();
  }

  /** Returns true if `sMod` setting is ok. */
  modKeyCheck(setting: Setting | Shortcut): boolean {
    if (setting.id !== 'sMod') {
      return true;
    }

    let allGood = true;
    if (setting.value === '') {
      // Valid but requires caution
      this.checkEmptyModKeyDebounced();
    }
    else {
      setting.value.split('+').forEach((modKey) => {
        if (Shortcut.VALID_MOD_KEYS.indexOf(modKey) === -1) {
          this.modKeyError = '"' + modKey + '" is not a valid modifier key. Valid modifier keys are: ' + Shortcut.VALID_MOD_KEYS.join(', ') + '.';
          allGood = false;
        }
      });
    }

    if (allGood) {
      this.modKeyError = '';
    }

    return allGood;
  }

  /** Check if a) no global modKey, and b) at least one shortcut also has no modifier. This makes an aggressive shortcut! So warn the user. */
  checkEmptyModKey() {
    if (this.settings.get('sMod') !== '') {
      return;
    }

    const modlessShortcut = _.find(this.displayedSettings, (setting: Setting) => {
      return setting.value.indexOf('+') === -1;
    });

    if (modlessShortcut) {
      this.modKeyError = 'Warning: You have entered no global modifier key and your shortcut for "' + modlessShortcut.name + '" is "' + modlessShortcut.value + '".\n\nThis means that whenever you press "' + modlessShortcut.value + '" anywhere in Headsoak, that shortcut will be run.';
    }
    else {
      this.modKeyError = '';
    }
  }

  revert() {
    if (! confirm('Are you sure you want to revert these ' + this.section + ' to their default values?\n\nThis can\'t be undone.')) {
      return;
    }

    const revertThese = this.section === 'shortcuts' ? _.concat([this.settings.data['sMod']], this.displayedSettings) : this.displayedSettings;

    _.each(revertThese, (setting: Setting | Shortcut) => {
      if (setting.value !== setting.default) {
        setting.updated(setting.default);
      }
    });

    this.modKeyError = '';

    this.syncDebounced();
  }

  changeEmail(): void {
    // @TODO/account Should check valid email prob, OR confirm that Firebase does

    this.modalService.alert('should change to ' + this.emailAddress);
    this.dataService.user.email = this.emailAddress;
  }

  changePassword(): void {
    if (! this.newPass.trim()) {
      // @TODO/account Should have some password requirements? Like min length, and not "password" or "12345" or other number sequence or all spaces?
      return;
    }

    // @TODO/now Loading indicator
    this.dataService.accountService.changePassword(this.oldPass, this.newPass, (err) => {
      if (err) {
        this._logger.warn('Failed to change password:', err);

        // @TODO/notifications @TODO/tooltips
        if (err.code === 'INVALID_PASSWORD') {
          this.modalService.alert('Failed to change password: the current password you entered is incorrect!');
        }
        else {
          this.modalService.alert('Failed to change password, something went wrong, sorry! ' + (err.message || err.code || err));
        }
        return;
      }

      this.oldPass = '';
      this.newPass = '';

      // @TODO/notifications @TODO/tooltips
      this.modalService.alert('Password successfully changed.')
    });
  }

  deleteAccount(): void {
    // @TODO/modals Use non-native prompt/alert for these
    var answer = prompt('Are you really really sure you want to delete the account belonging to ' + this.dataService.user.email + '? All of your data will be deleted. This can\'t be undone.\n\nType "I\'M REALLY REALLY SURE" (yes, all caps) to proceed:');

    if (answer !== 'I\'M REALLY REALLY SURE') {
      alert('No? Okay, good choice.');
      return;
    }

    var password = prompt('Well, it\'s been real!\n\nEnter your password to delete your account. This is it.\n\n(@TODO make this a password prompt)');

    if (! password) {
      alert('No? Okay, good choice.');
      return;
    }

    // if ($s.u.loading) return; // @TODO/rewrite

    this.dataService.accountService.deleteAccount(this.dataService.user.email, password, (err) => {
      if (err) {
        // @TODO/rewrite Turn off loading
      }
    });
  }

}
