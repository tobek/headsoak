import {Injectable} from 'angular2/core';
import {Subject} from 'rxjs/Subject';

var Firebase = require('firebase');

import {Logger} from '../utils/logger';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {UserService} from './user.service';
import {NotesService} from '../notes/';

@Injectable()
export class AccountService {
  loginState$: Subject<string>;

  private _logger: Logger = new Logger(this.constructor.name);
  private ref: Firebase;

  constructor(
    private notes: NotesService,
    private dataService: DataService,
    private analytics: AnalyticsService,
    public user: UserService
  ) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');

    this.loginState$ = new Subject<string>();
  }

  init() {
    // onAuth immediately fires with current auth state, so let's capture that specifically
    var initialAuthState = true;

    this.ref.onAuth((authData) => {
      if (initialAuthState) {
        initialAuthState = false;

        this.analytics.event('Account', 'initialized', authData ? 'logged_in' : 'logged_out');
      }

      if (authData) {
        this._logger.info('Log in succeeded', authData);

        // $s.u.loading = true; // while notes are loading @TODO/rewrite

        this.handleLogIn(authData);

        this.loginState$.next('logged-in');
      }
      else {
        // They're logged out
        this._logger.info('logged out');
        this.user.clear();

        // @TODO/rewrite
        // $s.u.loading = false;
        // window.clearInterval($s.u.digestInterval);
        // $s.m.modal = 'login';

        this.loginState$.next('logged-out');
      }
    });
  }

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

  handleLogIn(authData) {
    this.user.setData({
      uid: authData.uid,
      email: authData.provider && authData[authData.provider] && authData[authData.provider].email
    });
    this.user.loggedIn = true;

    this.dataService.init(this.user.uid);

    var userRef = this.ref.child('users/' + authData['uid'] + '/user');

    userRef.update({
      lastLogin: Date.now()
    }, (err) => {
      if (err) {
        this._logger.error('Failed to set user lastLogin:', err);
      }

      userRef.on('child_changed', this.userDataUpdated.bind(this));
    });
  }

  logout() {
    this.analytics.event('Account', 'logout');
    this.ref.unauth();
  }

  passwordReset(email: string) {
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
            return;
        }
      }

      if (! err) {
        this.analytics.event('Account', 'password_reset.success');
      }

      alert('Password reset email successfully sent to ' + email + '!\n\n(Unless there is no account for email ' + email + ', in which case nothing\'s been sent, but we\'re not telling you which cause that would be a tiny security hole.)\n\nAnyway, please check your email.'); // @TODO this message?

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
            alert('There\'s already an account with that email! You can go back and reset your password if you\'ve forgotten it.');
            break;
          default:
            alert('Sorry, something went wrong when trying to create your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            this._logger.error('Error creating account:', err);
        }

        // $s.u.loading = false; // @TODO/rewrite

        return;
      }

      this.analytics.event('Account', 'create_account.success');

      this._logger.info('New account created: user id ' + userData.id + ', email ' + userData.email);
      this.login(email, password);
    });
  }

  deleteAccount(email: string, password: string) {
    this.analytics.event('Account', 'delete_account.attempt');
    // $s.u.loading = true; // @TODO/rewrite

    this.ref.removeUser({ email: email, password: password}, (err) => {
      if (err) {
        this.analytics.event('Account', 'delete_account.error', err.code);
        switch (err.code) {
          case 'INVALID_PASSWORD':
          case 'INVALID_USER':
            alert('Wrong password! Reconsidering deleting your account?'); // @TODO friendlier message
            break;
          default:
            alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            this._logger.error('Error deleting account:', err);
        }

        return;
      }

      this.analytics.event('Account', 'delete_account.success');

      this._logger.info('Successfully deleted account with email', email);
      this.logout();
    });
  }

  userDataUpdated(newUserChild: FirebaseDataSnapshot) {
    if (newUserChild.key() !== 'lastLogin') return;

    // lastLogin changed!
    this._logger.warn('Nutmeg session started from elsewhere at ' + newUserChild.val() + '!');

    // @TODO/rewrite
    alert('Hey, it looks like you\'ve logged into Nutmeg from another device or browser window.\n\nNutmeg doesn\'t yet support editing from multiple sessions at the same time. Please refresh this window to load any changes made in other sessions and continue.');
    // $s.m.lockedOut = true; // prevent user from closing the following modal
    // $s.m.alert({
    //   bodyHTML: "<p>Hey, it looks like you've logged into Nutmeg from another device or browser window.</p><p>Nutmeg doesn't yet support editing from multiple sessions at the same time. Please <a href='#' onclick='document.location.reload()'>refresh</a> this window to load any changes made in other sessions and continue.</p>",
    //   ok: false,
    //   large: true
    // });
  }
}