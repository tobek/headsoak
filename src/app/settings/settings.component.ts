import {Inject, forwardRef, Component, ViewChild, ElementRef, HostBinding/*, ViewChildren, QueryList*/} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Subscription} from 'rxjs';

import {TooltipService} from '../utils/tooltip.service';
import {Logger} from '../utils/';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';
import {SettingsService} from './settings.service';
import {Setting, Shortcut} from './';

// import {SettingComponent} from './setting.component';

import * as _ from 'lodash';

@Component({
  selector: 'settings',
  template: require('./settings.component.html')
})
export class SettingsComponent {
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

  @HostBinding('class') hostClass: string;

  @ViewChild('changeEmailInput') changeEmailInput: ElementRef;
  @ViewChild('currentPasswordInput') currentPasswordInput: ElementRef;
  @ViewChild('changePasswordButton') changePasswordButton: ElementRef;

  private emailAddress: string = '';
  private oldPass: string = '';
  private newPass: string = '';
  private changeEmailIsLoading = false;
  private changePasswordIsLoading = false;

  private syncDebounced = _.debounce(this.dataService.sync.bind(this.dataService), 1000);
  private checkEmptyModKeyDebounced = _.debounce(this.checkEmptyModKey.bind(this), 1000);

  private modKeyError = '';

  private displayedSettings: Setting[] = [];

  private routeDataSub: Subscription;

  private _logger = new Logger(this.constructor.name);

  constructor(
    private route: ActivatedRoute,
    private modalService: ModalService,
    @Inject(forwardRef(() => SettingsService)) private settings: SettingsService,
    private tooltipService: TooltipService,
    private dataService: DataService
  ) {
  }

  ngOnInit() {
    this.routeDataSub = this.route.data.subscribe((data) => {
      this.section = data['slug'];
      this.hostClass = 'settings--' + this.section;
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

    // @TODO/rewrite/settings We should check for duplicate shortcuts here. Ideally we can have a per-setting place for errors (and the modless issue should be shown there). Also, we should check validity of shortcuts - could split by '+' and last/only element is key or special key, and any earlier ones are mod keys. EVEN BETTER: let the user press stuff and capture input

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
    // @TODO/modals
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
    if (! this.emailAddress.trim()) {
      this.tooltipService.justTheTip(
        'What\'s your email?',
        this.changeEmailInput.nativeElement,
        'error'
      );
      return;
    }
    if (this.emailAddress === this.dataService.user.email) {
      this.tooltipService.justTheTip(
        'Email hasn\'t changed',
        this.changeEmailInput.nativeElement,
        'warning'
      );
      return;
    }

    this.changeEmailIsLoading = true;
    this.dataService.accountService.changeEmail(this.emailAddress, () => {
      this.changeEmailIsLoading = false;
    });
  }

  changePassword(): void {
    if (! this.oldPass || ! this.newPass.trim()) {
      // @TODO/account Should have some password requirements? Like min length, and not "password" or "12345" or other number sequence or all spaces?
      this.tooltipService.justTheTip(
        'Please fill in old and new password fields',
        this.currentPasswordInput.nativeElement,
        'error'
      );
      return;
    }

    this.changePasswordIsLoading = true;
    this.dataService.accountService.changePassword(this.oldPass, this.newPass, (err) => {
      this.changePasswordIsLoading = false;

      if (err) {
        this._logger.warn('Failed to change password:', err);

        if (err.code === 'INVALID_PASSWORD') {
          this.tooltipService.justTheTip(
            'Wrong password!',
            this.currentPasswordInput.nativeElement,
            'error'
          );
        }
        else {
          this.tooltipService.justTheTip(
            'Something went wrong, sorry!<br><br>[' + (err.message || err.code || err) + ']',
            this.changePasswordButton.nativeElement,
            'error'
          );
        }
        return;
      }

      this.oldPass = '';
      this.newPass = '';

      this.tooltipService.justTheTip(
        'Password successfully changed',
        this.changePasswordButton.nativeElement,
        'success'
      );
    });
  }

  deleteAccount(): void {
    // @TODO/modals Use non-native prompt when sequential modals is done
    var answer = prompt('Are you really really sure you want to delete the account belonging to ' + this.dataService.user.email + '? All of your data will be deleted. This can\'t be undone.\n\nType "I\'M REALLY REALLY SURE" (yes, all caps) to proceed:');

    if (answer !== 'I\'M REALLY REALLY SURE') {
      // @TODO/modals Use non-native alert for this when sequential modals is implemented.
      alert('No? Okay, good choice.');
      return;
    }

    this.modalService.prompt(
      'Well, it\'s been real!\n\nEnter your password to delete your account. This is it.',
      (password, showLoading, hideLoading) => {
        if (! password) {
          // @TODO/modals Use non-native alert for this when sequential modals is implemented.
          alert('No? Okay, good choice.');
          return;
        }

        showLoading();

        this.dataService.accountService.deleteAccount(this.dataService.user.email, password, (err) => {
          hideLoading();
          
          // @TODO/modal The errors that this fires are done in native `alert`s - should be passed back to CB maybe and then shown in the modal?
          // if (err) {
          // }

          // Deleting account causes logout so no need to close the modal
        });

        return false; // explicit false to not close prompt until callback fires
      },
      {
        promptInputType: 'password',
        promptPlaceholder: 'Password',
        okButtonText: 'Delete my account',
      }
    );

  }

}
