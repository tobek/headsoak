import {Injectable, ChangeDetectorRef} from '@angular/core';
import {DomSanitizationService} from '@angular/platform-browser'; // @TODO In latest version of Angular this is called DomSanitizer
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {utils, Logger} from '../utils/';
import {AnalyticsService} from '../analytics.service';
import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';
import {UserService} from './user.service';
import {NotesService} from '../notes/';

const firebase = require('firebase');

@Injectable()
export class AccountService {
  FIREBASE_CONFIG = {
    apiKey: "AIzaSyDBNwLrix2punm62tZSGy_mQxIQLk6Mg3A",
    authDomain: "nutmeg.firebaseapp.com",
    databaseURL: "https://nutmeg.firebaseio.com",
    storageBucket: "nutmeg-78fba.appspot.com",
    messagingSenderId: "983562956055"
  };

  loginState$ = new ReplaySubject<string>(1);

  /** Whether private notes/tags are currently visible. */
  privateMode = false;

  /** By default we show sign up screen on first visit. If they're logged in and then they sign out, we should show the login view instead - this is how we keep track. */
  wasLoggedIn = false;

  rootChangeDetector: ChangeDetectorRef;

  ref: firebase.database.Reference;

  private _logger: Logger = new Logger(this.constructor.name);
  private auth: firebase.auth.Auth;

  private password: string; // @TODO/now This is pretty stupid

  constructor(
    private sanitizer: DomSanitizationService,
    private notes: NotesService,
    private dataService: DataService,
    private modalService: ModalService,
    private analytics: AnalyticsService,
    public user: UserService
  ) {
    firebase.initializeApp(this.FIREBASE_CONFIG);
    this.ref = firebase.database().ref();
    this.auth = firebase.auth();
  }

  init(rootChangeDetector: ChangeDetectorRef) {
    this.rootChangeDetector = rootChangeDetector;

    // onAuth immediately fires with current auth state, so let's capture that specifically
    var isInitialAuthState = true;

    this.auth.onAuthStateChanged((user: firebase.User) => {
      if (isInitialAuthState) {
        isInitialAuthState = false;

        this.analytics.event('Account', 'initialized', user ? 'logged_in' : 'logged_out');
      }

      if (user) {
        this._logger.info('Log in succeeded, got user:', user);

        // $s.u.loading = true; // while notes are loading @TODO/rewrite

        this.handleLoggedIn(user);
      }
      else {
        // They're logged out
        this.handleLoggedOut();
      }
    }, (err: firebase.auth.Error) => {
      this._logger.error('Error logging into Firebase:', err);
      alert('Sorry, there was an error logging you in to Headsoak! Check your internet connection and try again, and contact support@headsoak.com if it keeps happening.');
    });
  }

  /** User has initiated login attempt. */
  login(email: string, password: string) {
    // @TODO/rewrite
    // $s.u.loading = true;
    // $s.u.loggingIn = true;

    this.analytics.event('Account', 'login.attempt');

    this.auth.signInWithEmailAndPassword(email, password).then((user: firebase.User) => {
      this.analytics.event('Account', 'login.success');

      this.password = password; // @TODO/now This is pretty stupid

      // Actual login logic handled in `onAuthStateChanged` callback from this.init
    }, (err: firebase.FirebaseError) => {
      this._logger.warn('Failed to log in:', err);
      this.analytics.event('Account', 'login.err', err.code);
      
      switch (err.code) {
        case 'auth/invalid-email':
        case 'auth/user-disabled':
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          alert('Incorrect account credentials.'); // @TODO friendlier message
          break;
        default:
          this._logger.error('Failed to log in and reached unexpected error:', err);
          alert('Error logging in: ' + err.message || err.code || JSON.stringify(err));
      }

      // $s.u.loading = false; // so that they get the button back and can try again @TODO/rewrite

      this.loginState$.next('error');
    });
  }

  /** Firebase is in a logged-in state, whether page loaded that way or user has just logged in. */
  handleLoggedIn(user: firebase.User) {
    if (this.modalService.activeModal === 'login') {
      this.modalService.loading();
    }
    // Otherwise (e.g. they were logged in on page load so we never had to show login modal) let's just leave the non-modal, pre-initialization loader visible until everything is initialized.

    this.user.setData({
      uid: user.uid,
      email: user.email,
      provider: user.providerId,
    });
    this.user.loggedIn = true;

    this.dataService.init(this.user.uid, this);

    var userRef = this.ref.child('users/' + user['uid'] + '/user');

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
    this.auth.signOut(); // will trigger `handleLoggedOut` via firebase auth listener
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

    alert('Sorry, password reset is not quite implemented yet. Email support@headsoak.com and we can help you out though!');

    // this.auth.sendPasswordResetEmail(email);

    // @TODO/now Password reset is broken now, fix: <https://firebase.google.com/docs/reference/js/firebase.auth.Auth#sendPasswordResetEmail>
    // this.auth.resetPassword({ email: email }, (err) => {
    //   // $s.m.working = false;

    //   if (err) {
    //     this.analytics.event('Account', 'password_reset.error', err.code);
    //     switch (err.code) {
    //       case 'INVALID_USER':
    //         // For security purposes this should be indistinguishable from successful password reset
    //         break;
    //       default:
    //         alert('Sorry, something went wrong when trying to reset your password: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
    //         this._logger.error('Error resetting password:', err);
    //         cb(err);
    //         return;
    //     }
    //   }

    //   if (! err) {
    //     this.analytics.event('Account', 'password_reset.success');
    //   }

    //   cb();

    //   // @TODO: firebase lets you detect if user logged in with temporary token. should do so, and alert user to change password
    // });
  }

  createAccount(email: string, password: string) {
    this.analytics.event('Account', 'create_account.attempt');
    // $s.u.loading = true; // @TODO/rewrite

    this.auth.createUserWithEmailAndPassword(email, password).then((user: firebase.User) => {
      // account creation successful

      this.analytics.event('Account', 'create_account.success');

      this._logger.info('New account created with user id', user.uid);
      // should automatically log user in
    }, (err: firebase.FirebaseError) => {
      // account creation error
      this._logger.warn('Failed to create account', err);
      this.analytics.event('Account', 'create_account.error', err.code);

      switch (err.code) {
        case 'auth/invalid-email':
          alert('That\'s an invalid email address!');
          break;
        case 'auth/email-already-in-use':
          alert('There\'s already an account with that email! Please sign in.');
          break;
        case 'auth/weak-password':
          // @TODO Hopefully this doesn't ever happen but it's on the docs and I didn't see how it's controlled, so let's handle just in case
          alert('That password is not strong enough! Try adding numbers and/or symbols.');
          break;
        default:
          alert('Sorry, something went wrong when trying to create your account: ' + (err.message || err.code || err) + '. Please try again later or get in touch at support@headsoak.com.');
          this._logger.error('Unknown error when creating account:', err);
      }
    });
  }

  deleteAccount(email: string, password: string, cb: Function) {
    // @TODO/now

    alert('Sorry, account deletion is not quite implemented yet. Email support@headsoak.com and we can wrap things up.');

    // this.checkPassword(password, (err) => {
    //   if (err) {
    //     alert(err);
    //     cb(err)
    //     return;
    //   }

    //   this.analytics.event('Account', 'delete_account.attempt');

    //   // First remove this index.
    //   this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(null, (err) => {
    //     if (err) {
    //       // @TODO This happens a lot. Account deletion or log out can hit first and then no permission to do it I think? Either need to change Firebase rules or else do these all sequentially. But don't care that much. If user later signs up with same email it'll overwrite the value in /emailToId/, and if not, it can hang out there, it's tiny.
    //       this._logger.warn('Failed to remove value at `/emailToId/' + utils.formatForFirebase(this.user.email) + '` while deleting user account:', err);
    //     }
    //   });

    //   // Then delete account data
    //   this.ref.root().child('users/' + this.user.uid).set(null, (err) => {
    //     if (err) {
    //       alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
    //       this._logger.error('Error deleting account data:', err);

    //       cb(err);
    //       return;
    //     }

    //     // Now delete actual user account
    //     this.ref.removeUser({ email: email, password: password}, (err) => {
    //       if (err) {
    //         this.analytics.event('Account', 'delete_account.error', err.code);
    //         alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
    //         this._logger.error('Error removing user account after successfully deleting all account data:', err);
    //         // @TODO THINGS ARE IN A REAL WEIRD STATE - DELETED USER INFO BUT NOT ACCOUNT. Now they can log in still with same account details (and can't make new account) but they'll have data. Let's act like everything was fine, and we'll have to go in manually and delete account.
    //       }

    //       this.analytics.event('Account', 'delete_account.success');

    //       this._logger.info('Successfully deleted account with email', email);

    //       alert('Your account was deleted successfully - thanks for using Headsoak!'); // @TODO Should give opportunity to leave feedback? We'd need to make modal (in this case) blocking, and to send additional data (that it was before deletion) and to loggout on cancel or successful submit. Maybe leave feedback before finishing account deletion because writing feedback and knowing we want it might change their mind?
    //       this.logout();
    //       cb();
    //     });
    //   });
    // });
  }

  userDataUpdated(newUserChild: firebase.database.DataSnapshot) {
    if (newUserChild.key !== 'lastLogin') return;

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

    // @TODO/now This is pretty stupid
    if (password === this.password) {
      cb();
    }
    else {
      this._logger.warn('Password didn\'t check out.');
      cb('Wrong password');
    }

    // // @HACK We try to change their firebase password using supplied password, but the password we change it *to* is the same password, so if it's correct, result is nothing happens. If password is incorrect, however, we get an error.
    // this.ref.changePassword({
    //   email: this.user.email,
    //   oldPassword: password,
    //   newPassword: password
    // }, (err) => {
    //   if (err) {
    //     this._logger.warn('Password didn\'t check out:', err);
        
    //     if (err.code === 'INVALID_PASSWORD') {
    //       return cb('Wrong password');
    //     }
    //     else {
    //       return cb('Something went wrong, sorry! Give it another shot or try refreshing the page.');
    //     }
    //   }
    //   else {
    //     return cb();
    //   }
    // });
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
