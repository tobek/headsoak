import {Component} from 'angular2/core';

import {AppState} from '../app.service';
import {AccountService} from '../account.service';
import {PubSubService} from '../pub-sub.service';

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

  constructor(private accountService: AccountService, private pubSub: PubSubService) {
  }

  ngOnInit() {
    this.pubSub.subscribe(loginState => {
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
}
