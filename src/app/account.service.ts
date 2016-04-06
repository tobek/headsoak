import {Injectable} from 'angular2/core';
import {Subject} from 'rxjs/Subject';

var Firebase = require('firebase');

import {DataService} from './data.service';

@Injectable()
export class AccountService {
  loggedIn = false;
  uid: string;
  email: string;
  provider: string;

  loginState$: Subject<string>;

  private ref: Firebase;

  constructor(private dataService: DataService) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');

    this.loginState$ = new Subject<string>();
  }

  init() {
    this.ref.onAuth((authData) => {
      if (authData) {
        console.log('Log in succeeded', authData);

        // $s.u.loading = true; // while notes are loading @TODO/rewrite

        this.uid = authData.uid;
        this.provider = authData.provider;
        if (authData[this.provider] && authData[this.provider].email) {
          this.email = authData[this.provider].email;
        }

        this.loggedIn = true;
        this.dataService.init(this.uid);

        this.loginState$.next('logged-in');
      }
      else {
        // they logged out
        console.log('Logged out');
        this.uid = null;
        this.loggedIn = false;
        this.email = null;
        this.provider = null;

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

    this.ref.authWithPassword({
      email: email,
      password: password,
    }, (error) => {
      if (error) {
        switch (error.code) {
          case 'INVALID_EMAIL':
          case 'INVALID_PASSWORD':
          case 'INVALID_USER':
            alert('Incorrect account credentials.'); // @TODO friendlier message
            break;
          default:
            console.warn('Login failed: ', error);
            alert('Error logging in: ' + error.message || error.code || JSON.stringify(error));
        }

        // $s.u.loading = false; // so that they get the button back and can try again @TODO/rewrite

        this.loginState$.next('error');
      }
    }, {
      remember: 'default' // @TODO - should let user choose not to remember, in which case should be 'none'
    });
  }

  logout() {
    this.ref.unauth();
  }

  passwordReset(email: string) {
    // $s.m.working = true;

    this.ref.resetPassword({ email: email }, (err) => {
      // $s.m.working = false;

      if (err) {
        switch (err.code) {
          case 'INVALID_USER':
            // For security purposes this should be indistinguishable from successful password reset
            break;
          default:
            alert('Sorry, something went wrong when trying to reset your password: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            console.error('Error resetting password:', err);
            return;
        }
      }

      alert('Password reset email successfully sent to ' + email + '!\n\n(Unless there is no account for email ' + email + ', in which case nothing\'s been sent, but we\'re not telling you which cause that would be a tiny security hole.)\n\nAnyway, please check your email.'); // @TODO this message?

      // @TODO: firebase lets you detect if user logged in with temporary token. should do so, and alert user to change password
    });
  }

  createAccount(email: string, password: string) {
    // $s.u.loading = true; // @TODO/rewrite

    this.ref.createUser({ email: email, password: password}, (err, userData) => {
      if (err) {
        switch (err.code) {
          case 'INVALID_EMAIL':
            alert('That\'s an invalid email address!');
            break;
          case 'EMAIL_TAKEN':
            alert('There\'s already an account with that email! You can go back and reset your password if you\'ve forgotten it.');
            break;
          default:
            alert('Sorry, something went wrong when trying to create your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            console.error('Error creating account:', err);
        }

        // $s.u.loading = false; // @TODO/rewrite

        return;
      }

      console.log('New account made: user id ' + userData.id + ', email ' + userData.email);
      this.login(email, password);
    });
  }

  deleteAccount(email: string, password: string) {
    // $s.u.loading = true; // @TODO/rewrite

    this.ref.removeUser({ email: email, password: password}, (err) => {
      if (err) {
        switch (err.code) {
          case 'INVALID_PASSWORD':
          case 'INVALID_USER':
            alert('Wrong password! Reconsidering deleting your account?'); // @TODO friendlier message
            break;
          default:
            alert('Sorry, something went wrong when trying to delete your account: ' + (err.message || err.code || err) + '. Please try again later!'); // @TODO include support email here
            console.error('Error deleting account:', err);
        }

        return;
      }

      console.log('Successfully deleted account with email', email);
      this.logout();
    });
  }
}
