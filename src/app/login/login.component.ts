import {Component} from 'angular2/core';

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

  constructor(private accountService: AccountService) {
  }

  login() {
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

  forgotPassword() {

  }

  createAccount() {
    
  }
}
