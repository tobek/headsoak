import {Component, NgZone} from 'angular2/core';

import {AppState} from '../app.service';
import {AccountService} from '../account.service';

@Component({
  selector: 'login',
  pipes: [],
  styles: [ require('./login.css') ],
  template: require('./login.html')
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  pass1: string = '';
  pass2: string = '';
  view: string;

  constructor(private accountService: AccountService, private zone: NgZone) {
  }

  ngOnInit() {
    this.accountService.loginState$.subscribe((loginState) => {
      // @TODO running in zone here shouldn't be necessary, Angular2 should use Zone to automatically detect Rx event and update view, and seems to work in regular usage, but e2e test isn't working without this.
      this.zone.run(() => {
        switch (loginState) {
          case 'logged-in':
            this.view = 'logout';
            break;
          case 'logged-out':
            this.view = 'login';
            break;
          case 'error':
            this.password = '';
            this.view = 'login';
            break;
          default:
            this.view = 'login';
            break;
          }
      });
    });

    this.accountService.init();
  }

  resetInputs() {
    this.email = '';
    this.password = '';
    this.pass1 = '';
    this.pass2 = '';
  }

  login() {
    // if ($s.u.loading) return; // @TODO/rewrite
    this.accountService.login(this.email, this.password);
  }

  /** Shenanigans needed to get Chrome to offer to remember password. Copies credentials into pseudo-login.html inside iframe and submit it, since Chrome requires actual form submission and page load before it offers to remember. pseudo-login.html is also used as form `action` - `about:blank` and cancelling submission didn't work. */
  pseudoLogin (loginIframe: HTMLIFrameElement) {
    var loginIframeDoc = loginIframe.contentWindow ? loginIframe.contentWindow.document : loginIframe.contentDocument;

    var emailInput: HTMLInputElement = <HTMLInputElement>loginIframeDoc.getElementById('email');
    var passwordInput: HTMLInputElement = <HTMLInputElement>loginIframeDoc.getElementById('password');
    var loginForm: HTMLFormElement = <HTMLFormElement>loginIframeDoc.getElementById('login-form');

    emailInput.value = this.email;
    passwordInput.value = this.password;
    loginForm.submit();
  }

  logout() {
    this.accountService.logout();
    this.resetInputs();
  }

  forgotPassword() {
    var email: string = prompt('Please enter your email:', this.email);
    if (! email) return false;

    this.accountService.passwordReset(email);
  }

  createAccount() {
    // if ($s.u.loading) return; // @TODO/rewrite

    if (this.pass1 !== this.pass2) {
      alert('Those passwords don\'t match!');
      return;
    }

    this.accountService.createAccount(this.email, this.pass1);
  }

  deleteAccount() {
    var answer = prompt('Are you really really sure you want to delete the account belonging to ' + this.accountService.email + '? This can\'t be undone.\n\nType "I\'M REALLY REALLY SURE" (yes, all caps) to proceed:');

    if (answer !== 'I\'M REALLY REALLY SURE') {
      alert('No? Okay, good choice.');
      return;
    }

    var password = prompt('Well, it\'s been real!\n\nEnter your password to delete your account. This is it.\n\n(@TODO make this a password prompt)');

    // if ($s.u.loading) return; // @TODO/rewrite
    this.accountService.deleteAccount(this.accountService.email, password);
  }
}
