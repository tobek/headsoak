import {Injectable, NgZone, ChangeDetectorRef} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import * as Firebase from 'firebase';

import {utils, Logger, ToasterService, TooltipService} from '../utils/';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';
import {UserService} from './user.service';
import {NotesService} from '../notes/';

// @TODO/rewrite only do in dev mode
import {FirebaseMock} from '../mocks/';

@Injectable()
export class AccountService {
  FORCE_OFFLINE = false;

  loginState$ = new ReplaySubject<string>(1);

  /** Whether private notes/tags are currently visible. */
  privateMode = false;

  /** By default we show sign up screen on first visit. If they're logged in and then they sign out, we should show the login view instead - this is how we keep track. */
  wasLoggedIn = false;

  loggedInWithTemporaryPassword = false;

  rootChangeDetector: ChangeDetectorRef;

  ref: Firebase;

  private _logger: Logger = new Logger(this.constructor.name);

  private onlineStateRef: Firebase;

  constructor(
    private zone: NgZone,
    private notes: NotesService,
    private dataService: DataService,
    private modalService: ModalService,
    private toaster: ToasterService,
    private tooltipService: TooltipService,
    private analytics: AnalyticsService,
    public user: UserService
  ) {
    // Instantiating this outside of the Angular zone prevents Firebase from using Angular/Zone's monkey-patched async services. If we don't do this, then any of Firebase's continual setInterval and setTimeout and websocket calls etc. will trigger change detection for the whole app. This way, we have to trigger change detection manually.
    // @NOTE: This means that callbacks from functions like `this.ref.on('value', ...)` will not trigger change detection, even if called from within angular zone. In order to fix this, make sure Firebase callbacks execute in `zone.run(...)` when necessary.
    this.zone.runOutsideAngular(() => {
      this.ref = new Firebase('https://nutmeg.firebaseio.com/');
    });
  }

  init(rootChangeDetector: ChangeDetectorRef): void {
    this.rootChangeDetector = rootChangeDetector;

    if (this.FORCE_OFFLINE) {
      this.handleLoggedOut();

      setTimeout(() => {
        this.devOfflineHandler();
        this.ref.authWithPassword({ email: 'email@example.com', password: 'abc' });
      }, 0);

      return;
    }

    this.setUpAuthHandlers();
  }

  setUpAuthHandlers(): void {
    // onAuth immediately fires with current auth state, so let's capture that specifically
    let isInitialAuthState = true;

    this.ref.onAuth((authData) => { this.zone.run(() => {
      if (isInitialAuthState) {
        isInitialAuthState = false;

        this.analytics.event('Account', 'initialized', authData ? 'logged_in' : 'logged_out');
      }

      if (authData) {
        this._logger.info('Log in succeeded', authData);

        this.handleLoggedIn(authData);
      }
      else {
        // They're logged out
        this.handleLoggedOut();
      }
    }); });
  }

  /** A developer version of offline state for testing. @TODO/polish Remove this code from prod builds. */
  devOfflineHandler(): void {
    this.ref = <any> (new FirebaseMock());
    this.dataService.ref = <any> (new FirebaseMock());
    this.setUpAuthHandlers(); // need to set up again on new this.ref
  }

  /** User has initiated login attempt. */
  login(email: string, password: string, cb: (errMessage?: string) => void) {
    this.analytics.event('Account', 'login.attempt');

    this.ref.authWithPassword({
      email: email,
      password: password,
    }, (error) => { this.zone.run(() => {
      if (error) {
        this.analytics.event('Account', 'login.error', error.code);

        switch (error.code) {
          case 'INVALID_EMAIL':
          case 'INVALID_PASSWORD':
          case 'INVALID_USER':
            cb('Wrong credentials, please try again.'); // @TODO/copy friendlier message
            break;
          default:
            this._logger.warn('Login failed: ', error);
            cb('Error logging in, try again!<br><br>[' + (error.message || error.code || JSON.stringify(error)) + ']');
        }

        this.loginState$.next('error');
        return;
      }

      this.analytics.event('Account', 'login.success');

      cb();

      // Actual login logic handled in `onAuth` callback from this.init
    }); }, {
      remember: 'default' // @TODO - should let user choose not to remember, in which case should be 'none'
    });
  }

  /** Firebase is in a logged-in state, whether page loaded that way or user has just logged in. */
  handleLoggedIn(authData) {
    if (this.modalService.activeModal === 'login') {
      this.modalService.loading();
    }
    // Otherwise (e.g. they were logged in on page load so we never had to show login modal) let's just leave the non-modal, pre-initialization loader visible until everything is initialized.

    if (authData.password && authData.password.isTemporaryPassword) {
      this.loggedInWithTemporaryPassword = true;
    }

    this.user.setData({
      uid: authData.uid,
      email: authData.provider && authData[authData.provider] && authData[authData.provider].email,
      provider: authData.provider,
    });
    this.user.loggedIn = true;

    this.dataService.init(this.user.uid, this);

    const userRef = this.ref.child('users/' + authData['uid'] + '/user');

    userRef.update({
      lastLogin: Date.now()
    }, (err) => {
      if (err) {
        this._logger.error('Failed to set user lastLogin:', err);
      }

      userRef.on('child_changed', (val) => {
        this.zone.run(() => {
          this.userDataUpdated(val);
        });
      });
    });

    this.loginState$.next('logged-in');
  }

  /** User explicitly requested to logout. */
  logout() {
    this.analytics.event('Account', 'logout');
    this.wasLoggedIn = true;
    this.ref.unauth(); // will trigger `handleLoggedOut` via firebase auth listener
  }

  /** Firebase is in a logged-out state, whether page loaded that way or user has just logged out. */
  handleLoggedOut() {
    this._logger.info('logged out');

    this.dataService.clear();

    // window.clearInterval($s.u.digestInterval); // @TODO/rewrite

    this.loginState$.next('logged-out');

    this.modalService.login();
  }

  passwordReset(email: string, cb: (errMessage?: string) => void) {
    this.analytics.event('Account', 'password_reset.attempt');

    this.ref.resetPassword({ email: email }, (err) => {
      let errMessage = null;

      if (err) {
        this.analytics.event('Account', 'password_reset.error', err.code);
        switch (err.code) {
          case 'INVALID_USER':
            // For security purposes this should be indistinguishable from successful password reset
            break;
          default:
            errMessage = 'Sorry, something went wrong when trying to reset your password:<br><br><code>[' + (err.message || err.code || err) + ']</code><br><br>Please try again later or get in touch at <a href="mailto:support@headsoak.com">support@headsoak.com</a>.';
            this._logger.error('Error resetting password:', err);
        }
      }

      if (! err) {
        this.analytics.event('Account', 'password_reset.success');
      }

      this.zone.run(() => {
        cb(errMessage);
      });
    });
  }

  createAccount(email: string, password: string, cb: (errMessage?: string) => void) {
    this.analytics.event('Account', 'create_account.attempt');

    this.ref.createUser({ email: email, password: password}, (err, userData) => { this.zone.run(() => {
      if (err) {
        switch (err.code) {
          case 'INVALID_EMAIL':
            this.analytics.event('Account', 'create_account.error', err.code);
            cb('That\'s an invalid email address!');
            break;
          case 'EMAIL_TAKEN':
            // Just try to log them in
            this.login(email, password, (errMessage) => {
              if (errMessage) {
                // I guess just throw this default message at them, then they'll try to sign in and maybe get wrong password again, and then will see password reset.
                this.analytics.event('Account', 'create_account.error', err.code);
                cb('There\'s already an account registered with that email! Please sign in.');
              }
              else {
                this.analytics.event('Account', 'create_account.logged_in_instead');
              }
            });
            return;
          default:
            this.analytics.event('Account', 'create_account.error', err.code);
            cb('Sorry, something went wrong trying to create your account. Please try again!<br><br><code>[' + (err.message || err.code || err) + ']</code><br><br>Please try again later or get in touch at <a href="mailto:support@headsoak.com">support@headsoak.com</a>.');
            this._logger.error('Error creating account:', err);
        }

        this.loginState$.next('error');

        return;
      }

      this.analytics.event('Account', 'create_account.success');

      this._logger.info('New account created with user id', userData.id);
      this.login(email, password, cb);
    }); });
  }

  changeEmail(newEmail: string, doneCb: () => void): void {
    // @TODO/account Should check valid email, OR confirm that Firebase does

    this.modalService.prompt(
      'Please enter your password in order to change your email address:',
      (password, showLoading, hideLoading) => {
        if (! password) {
          return false; // explicit false indicates that the prompt shouldn't close
        }

        showLoading();

        this.ref.changeEmail({
          oldEmail: this.user.email,
          newEmail: newEmail,
          password: password,
        }, (err) => { this.zone.run(() => {
          hideLoading();
          this.changeEmailResponseHandler(newEmail, err);
          doneCb();
        }); });

        return false; // don't close modal, wait for Firebase response so we can keep it open if wrong password
      },
      false,
      {
        promptInputType: 'password',
        promptPlaceholder: 'Password',
        okButtonText: 'Change email',
        cancelCb: doneCb,
      }
    );
  }

  /** Called while modal is still open, so need to explicitly close modal when appropriate. */
  changeEmailResponseHandler(newEmail: string, err?): void {
    if (err) {
      this._logger.warn('Failed to change email:', err);

      if (err.code === 'INVALID_PASSWORD') {
        this.tooltipService.justTheTip(
          'Wrong password!',
          this.modalService.modal.promptInput.nativeElement,
          'error'
        );
      }
      else {
        this.tooltipService.justTheTip(
          'Sorry, try again!<br><br><code>[' + (err.message || err.code || err) + ']</code>',
          this.modalService.modal.okButton.nativeElement,
          'error'
        );
        this._logger.error('Failed to change email:', err);
      }

      return; // don't close modal
    }

    // The current logged-in session is tied to old email and continues returning it in provider data upon login (which would mess up a lot of things) until they log out and in again, with no easy workaround, so... force them to log in again
    // @TODO/modal Need blocking modal
    alert('Your email has been changed to ' + newEmail + '. Please log in with your new email address.');
    this.modalService.close();
    setTimeout(this.logout.bind(this), 10);
  }

  changePassword(oldPassword: string, newPassword: string, cb: (error: any) => void): void {
    this.ref.changePassword({
      email: this.user.email,
      oldPassword: oldPassword,
      newPassword: newPassword,
    }, (err) => {
      this.zone.run(() => {
        cb(err);
      });
    });
  }

  deleteAccount(email: string, password: string, cb: Function) {
    this.checkPassword(password, (err) => {
      if (err) {
        // @TODO/modals @TODO/tooltip Not sure which
        alert(err);
        cb(err);
        return;
      }

      this.analytics.event('Account', 'delete_account.attempt');

      // First remove this index.
      this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(null, (err) => {
        if (err) {
          // @TODO This happens a lot. Account deletion or log out can hit first and then no permission to do it I think? Either need to change Firebase rules or else do these all sequentially. But don't care that much. If user later signs up with same email it'll overwrite the value in /emailToId/, and if not, it can hang out there, it's tiny. (Might show up when searching for a user by email?)
          this.analytics.event('Account', 'delete_account.error_emailtoid', err.code);
          this._logger.warn('Failed to remove value at `/emailToId/' + utils.formatForFirebase(this.user.email) + '` while deleting user account:', err);
        }
      });

      // Then delete account data
      this.ref.root().child('users/' + this.user.uid).set(null, (err) => {
        if (err) {
          // @TODO/modals @TODO/tooltip Not sure which
          alert('Sorry, something went wrong when trying to delete your account: [' + (err.message || err.code || err) + ']. Please try again later or get in touch at support@headsoak.com');
          this.analytics.event('Account', 'delete_account.error_data', err.code);
          this._logger.error('Error deleting account data:', err);

          this.zone.run(() => {
            cb(err);
          });
          return;
        }

        // Now delete actual user account
        this.ref.removeUser({ email: email, password: password}, (err) => {
          if (err) {
            this.analytics.event('Account', 'delete_account.error_user', err.code);
            // @TODO/modals @TODO/tooltip Not sure which
            alert('Sorry, something went wrong when trying to delete your account: [' + (err.message || err.code || err) + ']. Please try again later or get in touch at support@headsoak.com');
            this._logger.error('Error removing user account after successfully deleting all account data:', err);
            // @TODO THINGS ARE IN A REAL WEIRD STATE - DELETED USER INFO BUT NOT ACCOUNT. Now they can log in still with same account details (and can't make new account) but they'll have data. Let's act like everything was fine, and we'll have to go in manually and delete account.
          }
          else {
            this.analytics.event('Account', 'delete_account.success');
          }

          this._logger.info('Successfully deleted account with email', email);

          // @TODO/modals Will this work with logout? Might need blocking modal
          alert('Your account was deleted successfully - thanks for using Headsoak!'); // @TODO Should give opportunity to leave feedback? We'd need to make modal (in this case) blocking, and to send additional data (that it was before deletion) and to loggout on cancel or successful submit. Maybe leave feedback before finishing account deletion because writing feedback and knowing we want it might change their mind?

          this.zone.run(() => {
            this.logout();
            cb();
          });
        });
      });
    });
  }

  userDataUpdated(newUserChild: FirebaseDataSnapshot) {
    if (newUserChild.key() !== 'lastLogin') {
      return;
    }

    // lastLogin changed!
    this._logger.info('Headsoak session started from elsewhere at ' + newUserChild.val() + '!');

    if (ENV === 'development') {
      if (! this['loggedInElsewhereDialogShown']) {
        this.modalService.alert('<p>You logged in to this account in another session. Because this is a dev environment we\'ll let it slide, but watch out for your data.</p><p>This dialog won\'t be shown again in this session.', true);
        this['loggedInElsewhereDialogShown'] = true;
      }

      return;
    }

    // @TODO/modals Need a way to queue up modals, what happens if this gets hit when another modal is open? Especially could be weird when the close listener to refresh fires too soon.

    // @TODO We could log time and IP and browser etc. of the login so we can tell them when and where etc.
    this.modalService.alert('<p>Hey, it looks like you\'ve logged into Headsoak from another device or browser window.</p><p>Headsoak doesn\'t yet support editing from multiple sessions at the same time. Please <a href="#" onclick="document.location.reload()">refresh this window</a> to load any changes made in other sessions and continue.</p>', true);

    // When this modal is closed, refresh the page
    this.modalService.closed$.first().subscribe(function() {
      document.location.reload();
    });
  }

  /** Calls cb with error message if password is incorrect or with null if password is correct. */
  checkPassword(password: string, cb: Function): void {
    if (! password) {
      return cb('Please enter your password.');
    }

    if (! this.user.uid || ! this.user.email) {
      this._logger.error('User not logged in or there was a problem initializing user info');
      return cb('Something went wrong, sorry! Give it another shot or try refreshing the page.');
    }

    // @HACK We try to change their firebase password using supplied password, but the password we change it *to* is the same password, so if it's correct, result is nothing happens. If password is incorrect, however, we get an error.
    this.ref.changePassword({
      email: this.user.email,
      oldPassword: password,
      newPassword: password
    }, (err) => { this.zone.run(() => {
      if (err) {
        this._logger.warn('Password didn\'t check out:', err);

        if (err.code === 'INVALID_PASSWORD') {
          return cb('Wrong password');
        }
        else {
          this._logger.error('Error while "changing" password in order to check password:', err);
          return cb('Something went wrong, sorry! Give it another shot or try refreshing the page.');
        }
      }
      else {
        return cb();
      }
    }); });
  }

  // @TODO/ece The messaging is maybe switched here. "Private mode on" could be interpreted as privacy features are activated, meaning private notes are now hidden. That's why I'm adding the full text in toaster after title text - however, copy in the private mode modal itself (and toasters when making note private) has this same problem. Also, we can consider using warning or error toaster for enabling/disabling/both.
  enablePrivateMode() {
    this.privateMode = true;
    this.dataService.activeUIs.noteQuery.queryUpdated();

    this._logger.log('Enabling private mode');
    // @TODO/privacy When there are private tags, copy here should be updated.
    this.toaster.info('Private notes will now be visible.', 'Private mode on');
  }
  disablePrivateMode() {
    this.privateMode = false;
    this.dataService.activeUIs.noteQuery.queryUpdated();

    this._logger.log('Disabling private mode');
    this.toaster.info('Private notes will now be hidden', 'Private mode off');
  }
}
