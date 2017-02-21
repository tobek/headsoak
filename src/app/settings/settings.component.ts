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
    download: 'Download desktop application',
  };

  initialized = false;

  // @ViewChildren(SettingComponent) settingComponents: QueryList<SettingComponent>;

  @HostBinding('class') hostClass: string;

  @ViewChild('changeEmailInput') changeEmailInput: ElementRef;
  @ViewChild('currentPasswordInput') currentPasswordInput: ElementRef;
  @ViewChild('changePasswordButton') changePasswordButton: ElementRef;
  @ViewChild('modKeyHeading') modKeyHeading: ElementRef;

  private emailAddress: string = '';
  private oldPass: string = '';
  private newPass: string = '';
  private changeEmailIsLoading = false;
  private changePasswordIsLoading = false;

  /** DataService's throttled sync interval is a bit long if user is sitting there waiting for setting to save. */
  private syncDebounced = _.debounce(this.dataService.sync.bind(this.dataService), 1000);
  private checkEmptyModKeyDebounced = _.debounce(this.checkEmptyModKey.bind(this), 1000);

  private _modKeyError = '';

  private displayedSettings: Setting[] = [];
  private subSections: string[] = [];
  private subSectionedSettings: { [settingId: string]: Setting[] } = {};

  private showLinuxInstr = false;
  private showMacInstr = false;
  private showWinInstr = false;

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
    delete window['headsoakRidicModKeyRevert'];
  }

  init(): void {
    this._logger.log('`Settings` component initialized');

    this.displayedSettings = _.filter(this.settings.data, (setting) => {
      if (setting.section === this.section && ! setting.overkill && ! setting.internal) {
        const subSection = setting.subSection || ''; // otherwise we get `'undefined'` as key and as subsection - this way we can get a falsey value to exclude from template

        if (! this.subSectionedSettings[subSection]) {
          this.subSectionedSettings[subSection] = [];
          this.subSections.push(subSection);
        }

        this.subSectionedSettings[subSection].push(setting);

        return true;
      }
    });

    this.initialized = true;

    if (this.section === 'shortcuts') {
      window['headsoakRidicModKeyRevert'] = this.revertModKey.bind(this); // @HACK so that we can trigger from dynamically created tooltip...

      this.checkEmptyModKey();
    }
    else if (this.section === 'account') {
      this.emailAddress = this.dataService.user.email;
    }
  }

  // @TODO/temp
  testAnError() {
    const hahaa = 42;
    console.log(hahaa['nope']());
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

    this.syncDebounced();

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
          this.modKeyError = '<code>' + _.escape(modKey) + '</code> is not a valid modifier key.<br><br>Valid modifier keys are: <code>' + Shortcut.VALID_MOD_KEYS.join('</code>, <code>') + '</code>.';
          allGood = false;
        }
      });
    }

    if (allGood) {
      this.modKeyError = '';
    }

    return allGood;
  }

  revertModKey() {
    this.settings.data['sMod'].value = this.settings.data['sMod'].default;
    this.settingUpdated(this.settings.data['sMod']);
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
      // @TODO/polish @TODO/ece How's this? And the other warning above
      this.modKeyError = '<b>Warning:</b> You have entered no global modifier key and your shortcut for "' + modlessShortcut.name + '" is <code>' + _.escape(modlessShortcut.value) + '</code>.<br><br>This means that whenever you press <code>' + _.escape(modlessShortcut.value) + '</code> anywhere in Headsoak, that shortcut will be run.';
    }
    else {
      this.modKeyError = '';
    }
  }

  get modKeyError(): string {
    return this._modKeyError;
  }
  set modKeyError(newVal: string) {
    this._modKeyError = newVal;

    if (newVal) {
      this.settings.initialized$.first().subscribe(() => {
        setTimeout(this.modKeyErrorTooltip.bind(this), 0);
      });
    }
  }

  modKeyErrorTooltip() {
    this.tooltipService.justTheTip(
      this.modKeyError + '<br><br><a class="mod-key-revert-link" onclick="window.headsoakRidicModKeyRevert()">Revert to default</a>',
      this.modKeyHeading.nativeElement,
      'error', null, 'right'
    );
  }

  validShortcutInfo() {
    // @TODO/shortcuts @TODO/soon @TODO/ece Whatdo you think of this? Maybe gray instead of orange for <code> here - and in smart tag documentation? Also look at the "Modifier Keys" heading tooltip (this is hard on gray text) AND mod key error tooltip.
    this.modalService.alert(
      '<p>Type in a letter or symbol (e.g. <code>n</code> or <code>#</code>), or write out one of the following keys:</p><ul><li><code>backspace</code></li><li><code>tab</code></li><li><code>enter</code></li><li><code>return</code></li><li><code>capslock</code></li><li><code>esc</code></li><li><code>escape</code></li><li><code>space</code></li><li><code>pageup</code></li><li><code>pagedown</code></li><li><code>end</code></li><li><code>home</code></li><li><code>left</code></li><li><code>up</code></li><li><code>right</code></li><li><code>down</code></li><li><code>ins</code></li><li><code>del</code></li></ul><p>You may include modifier keys in here too, e.g. <code>shift+alt+n</code>.</p>',
      true,
      'OK Thanks'
    );
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

          this._logger.error('Failed to change password:', err);
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
    // @TODO/polish We should ask for password first and then for REALLY REALLY SURE
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
      false,
      {
        promptInputType: 'password',
        promptPlaceholder: 'Password',
        okButtonText: 'Delete my account',
      }
    );

  }

}
