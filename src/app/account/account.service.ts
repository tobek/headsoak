import {Injectable, ChangeDetectorRef} from '@angular/core';
import {DomSanitizationService} from '@angular/platform-browser'; // @TODO In latest version of Angular this is called DomSanitizer
import {ReplaySubject} from 'rxjs/ReplaySubject';

const Firebase = require('firebase');

import {utils, Logger} from '../utils/';
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

  rootChangeDetector: ChangeDetectorRef;

  private _logger: Logger = new Logger(this.constructor.name);
  private ref: Firebase;

  private onlineStateRef: Firebase;

  constructor(
    private sanitizer: DomSanitizationService,
    private notes: NotesService,
    private dataService: DataService,
    private modalService: ModalService,
    private analytics: AnalyticsService,
    public user: UserService
  ) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');
  }

  init(rootChangeDetector: ChangeDetectorRef): void {
    this.rootChangeDetector = rootChangeDetector;

    if (this.FORCE_OFFLINE) {
      this.handleLoggedOut();

      setTimeout(() => {
        this.offlineHandler();
        this.ref.authWithPassword({ email: 'email@example.com', password: 'abc' });
      }, 0);

      return;
    }

    this.setUpAuthHandlers();

    // @TODO in theory this is where, later, we can listen for connection state always and handle online/offline. For now we have an offline mode just when on local
    if (document.location.href.indexOf('localhost:3000') !== -1){
      const onlineStateTimeout = window.setTimeout(this.offlineHandler.bind(this), 5000);
      
      this.onlineStateRef = this.ref.root().child('.info/connected');
      this.onlineStateRef.on('value', (snap) => {
        const online = snap.val();
        this._logger.log('Online state callback fired with:', online ? 'online' : 'offline');

        if (online) {
          window.clearTimeout(onlineStateTimeout);
          this.onlineStateRef.off();
        }
      });
    }
  }

  setUpAuthHandlers(): void {
    // onAuth immediately fires with current auth state, so let's capture that specifically
    var isInitialAuthState = true;

    this.ref.onAuth((authData) => {
      if (isInitialAuthState) {
        isInitialAuthState = false;

        this.analytics.event('Account', 'initialized', authData ? 'logged_in' : 'logged_out');
      }

      if (authData) {
        this._logger.info('Log in succeeded', authData);

        // $s.u.loading = true; // while notes are loading @TODO/rewrite

        this.handleLoggedIn(authData);
      }
      else {
        // They're logged out
        this.handleLoggedOut();
      }
    });
  }

  offlineHandler(): void {
    this._logger.log('Still offline after 5 seconds');

    if (this.onlineStateRef) {
      this.onlineStateRef.off();
    }

    // @TODO/rewrite This should be dev only, otherwise should init from localStorage or something
    // @TODO/rewrite When it's no longer dev only, this.dataService.status needs to indicate offline.

    this.ref = <any>(new FirebaseMock());
    this.dataService.ref = <any>(new FirebaseMock());
    this.setUpAuthHandlers(); // need to set up again on new this.ref
  }

  /** User has initiated login attempt. */
  login(email: string, password: string) {
    // @TODO/rewrite
    // $s.u.loading = true;
    // $s.u.loggingIn = true;

    this.analytics.event('Account', 'login.attempt');

    this.ref.authWithPassword({
      email: email,
      password: password,
    }, (error) => {
      if (error) {
        this.analytics.event('Account', 'login.error', error.code);

        switch (error.code) {
          case 'INVALID_EMAIL':
          case 'INVALID_PASSWORD':
          case 'INVALID_USER':
            alert('Incorrect account credentials.'); // @TODO friendlier message
            break;
          default:
            this._logger.warn('Login failed: ', error);
            alert('Error logging in: ' + error.message || error.code || JSON.stringify(error));
        }

        // $s.u.loading = false; // so that they get the button back and can try again @TODO/rewrite

        this.loginState$.next('error');
        return;
      }

      this.analytics.event('Account', 'login.success');

      // Actual login logic handled in `onAuth` callback from this.init
    }, {
      remember: 'default' // @TODO - should let user choose not to remember, in which case should be 'none'
    });
  }

  /** Firebase is in a logged-in state, whether page loaded that way or user has just logged in. */
  handleLoggedIn(authData) {
    if (this.modalService.activeModal === 'login') {
      this.modalService.loading();
    }
    // Otherwise (e.g. they were logged in on page load so we never had to show login modal) let's just leave the non-modal, pre-initialization loader visible until everything is initialized.

    this.user.setData({
      uid: authData.uid,
      email: authData.provider && authData[authData.provider] && authData[authData.provider].email,
      provider: authData.provider,
    });
    this.user.loggedIn = true;

    this.dataService.init(this.user.uid, this);

    var userRef = this.ref.child('users/' + authData['uid'] + '/user');

    userRef.update({
      lastLogin: Date.now()
    }, (err) => {
      if (err) {
        this._logger.error('Failed to set user lastLogin:', err);
      }

      userRef.on('child_changed', this.userDataUpdated.bind(this));
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

    // @TODO/rewrite
    // $s.u.loading = false;
    // window.clearInterval($s.u.digestInterval);
    // $s.m.modal = 'login';

    this.loginState$.next('logged-out');

    this.modalService.login();
  }

  passwordReset(email: string, cb: Function) {
    this.analytics.event('Account', 'password_reset.attempt');
    // $s.m.working = true;

    this.ref.resetPassword({ email: email }, (err) => {
      // $s.m.working = false;

      if (err) {
        this.analytics.event('Account', 'password_reset.error', err.code);
        switch (err.code) {
          case 'INVALID_USER':
            // For security purposes this should be indistinguishable from successful password reset
            break;
          default:
            alert('Sorry, something went wrong when trying to reset your password: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            this._logger.error('Error resetting password:', err);
            cb(err);
            return;
        }
      }

      if (! err) {
        this.analytics.event('Account', 'password_reset.success');
      }

      cb();

      // @TODO: firebase lets you detect if user logged in with temporary token. should do so, and alert user to change password
    });
  }

  createAccount(email: string, password: string) {
    this.analytics.event('Account', 'create_account.attempt');
    // $s.u.loading = true; // @TODO/rewrite

    this.ref.createUser({ email: email, password: password}, (err, userData) => {
      if (err) {
        this.analytics.event('Account', 'create_account.error', err.code);
        switch (err.code) {
          case 'INVALID_EMAIL':
            alert('That\'s an invalid email address!');
            break;
          case 'EMAIL_TAKEN':
            alert('There\'s already an account with that email! Please sign in.');
            break;
          default:
            alert('Sorry, something went wrong when trying to create your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            this._logger.error('Error creating account:', err);
        }

        // $s.u.loading = false; // @TODO/rewrite

        return;
      }

      this.analytics.event('Account', 'create_account.success');

      this._logger.info('New account created with user id', userData.id);
      this.login(email, password);
    });
  }

  changeEmail(newEmail: string): void {
    // @TODO/account Should check valid email, OR confirm that Firebase does

    this.modalService.prompt(
      'Please enter your password in order to change your email address:',
      (password) => {
        if (! password) {
          return false;
        }

        // @TODO/now Loading indicator (at least disable button)
        this.ref.changeEmail({
          oldEmail: this.user.email,
          newEmail: newEmail,
          password: password,
        }, (err) => {
          // @TODO/now Remove loading indicator
          this.changeEmailResponseHandler(newEmail, err);
        });

        return false; // don't close modal, wait for Firebase response so we can keep it open if wrong password
      },
      {
        promptInputType: 'password',
        promptPlaceholder: 'Password',
        okButtonText: 'Change email',
      }
    );
  }

  /** Called while modal is still open, so need to explicitly close modal when appropriate. */
  changeEmailResponseHandler(newEmail: string, err?): void {
    if (err) {
      this._logger.warn('Failed to change email:', err);

      if (err.code === 'INVALID_PASSWORD') {
        // @TODO/tooltips Tooltip over modal input
        alert('The password you entered is incorrect!');
        return; // don't close modal
      }

      // @TODO/notifications @TODO/toaster Should be toaster or alert? Maybe alert, so you don't miss the toaster. Toaster should be not for pretty important things?
      alert('Failed to change email, something went wrong, sorry! ' + (err.message || err.code || err));
    }

    // @TODO/toaster
    alert('nice, changed to ' + newEmail);
    this.dataService.user.email = newEmail;

    this.modalService.close();
  }

  changePassword(oldPassword: string, newPassword: string, cb: (error: any) => void): void {
    this.ref.changePassword({
      email: this.user.email,
      oldPassword: oldPassword,
      newPassword: newPassword,
    }, cb);
  }

  deleteAccount(email: string, password: string, cb: Function) {
    this.checkPassword(password, (err) => {
      if (err) {
        alert(err);
        cb(err)
        return;
      }

      this.analytics.event('Account', 'delete_account.attempt');

      // First remove this index.
      this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(null, (err) => {
        if (err) {
          // @TODO This happens a lot. Account deletion or log out can hit first and then no permission to do it I think? Either need to change Firebase rules or else do these all sequentially. But don't care that much. If user later signs up with same email it'll overwrite the value in /emailToId/, and if not, it can hang out there, it's tiny.
          this._logger.warn('Failed to remove value at `/emailToId/' + utils.formatForFirebase(this.user.email) + '` while deleting user account:', err);
        }
      });

      // Then delete account data
      this.ref.root().child('users/' + this.user.uid).set(null, (err) => {
        if (err) {
          alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
          this._logger.error('Error deleting account data:', err);

          cb(err);
          return;
        }

        // Now delete actual user account
        this.ref.removeUser({ email: email, password: password}, (err) => {
          if (err) {
            this.analytics.event('Account', 'delete_account.error', err.code);
            alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            this._logger.error('Error removing user account after successfully deleting all account data:', err);
            // @TODO THINGS ARE IN A REAL WEIRD STATE - DELETED USER INFO BUT NOT ACCOUNT. Now they can log in still with same account details (and can't make new account) but they'll have data. Let's act like everything was fine, and we'll have to go in manually and delete account.
          }

          this.analytics.event('Account', 'delete_account.success');

          this._logger.info('Successfully deleted account with email', email);

          alert('Your account was deleted successfully - thanks for using Headsoak!'); // @TODO Should give opportunity to leave feedback? We'd need to make modal (in this case) blocking, and to send additional data (that it was before deletion) and to loggout on cancel or successful submit. Maybe leave feedback before finishing account deletion because writing feedback and knowing we want it might change their mind?
          this.logout();
          cb();
        });
      });
    });
  }

  userDataUpdated(newUserChild: FirebaseDataSnapshot) {
    if (newUserChild.key() !== 'lastLogin') return;

    // lastLogin changed!
    this._logger.warn('Headsoak session started from elsewhere at ' + newUserChild.val() + '!');

    // @TODO/modals Need a way to queue up modals, what happens if this gets hit when another modal is open? Especially could be weird when the close listener to refresh fires too soon.

    // @TODO We could log time and IP and browser etc. of the login so we can tell them when and where etc.
    this.modalService.alert(this.sanitizer.bypassSecurityTrustHtml('<p>Hey, it looks like you\'ve logged into Headsoak from another device or browser window.</p><p>Headsoak doesn\'t yet support editing from multiple sessions at the same time. Please  <a href="#" onclick="document.location.reload()">refresh this window</a> to load any changes made in other sessions and continue.</p>'));

    // When this modal is closed, refresh the page
    this.modalService.closed$.first().subscribe(function() {
      document.location.reload();
    });
  }

  /** Calls cb with error message if password is incorrect or with null if password is correct. */
  checkPassword(password: string, cb: Function): void {
    if (! password) return cb('Please enter your password.');

    if (! this.user.uid || ! this.user.email) {
      this._logger.error('User not logged in or there was a problem initializing user info');
      return cb('Something went wrong, sorry! Give it another shot or try refreshing the page.');
    }

    // @HACK We try to change their firebase password using supplied password, but the password we change it *to* is the same password, so if it's correct, result is nothing happens. If password is incorrect, however, we get an error.
    this.ref.changePassword({
      email: this.user.email,
      oldPassword: password,
      newPassword: password
    }, (err) => {
      if (err) {
        this._logger.warn('Password didn\'t check out:', err);
        
        if (err.code === 'INVALID_PASSWORD') {
          return cb('Wrong password');
        }
        else {
          return cb('Something went wrong, sorry! Give it another shot or try refreshing the page.');
        }
      }
      else {
        return cb();
      }
    });
  }

  enablePrivateMode() {
    this.privateMode = true;
    this.dataService.activeUIs.noteQuery.queryUpdated();
  }
  disablePrivateMode() {
    this.privateMode = false;
    this.dataService.activeUIs.noteQuery.queryUpdated();
  }
}
