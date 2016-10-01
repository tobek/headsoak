import {Component, NgZone} from '@angular/core';
import {Subscription} from 'rxjs';

import {AccountService} from './account.service';


type ViewType = 'login' | 'create-account' | 'reset-password';

@Component({
  selector: 'login',
  pipes: [],
  template: require('./login.component.html')
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  pass1: string = '';
  pass2: string = '';
  _view: ViewType;

  passwordResetSuccess = false;

  private loginSub: Subscription;

  constructor(private accountService: AccountService, private zone: NgZone) {
  }

  ngOnInit() {
    // Since accountService.loginState$ is a ReplaySubject, this will fire immediately if there already is a login state, otherwise will wait for initialization and then fire
    this.loginSub = this.accountService.loginState$.subscribe((loginState) => {
      // @TODO running in zone here shouldn't be necessary, Angular2 should use Zone to automatically detect Rx event and update view, and seems to work in regular usage, but e2e test isn't working without this.
      this.zone.run(() => {
        switch (loginState) {
          case 'logged-in':
            this.view = null;
            this.resetInputs();
            break;
          case 'logged-out':
            this.resetInputs();
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
  }

  ngOnDestroy() {
    this.loginSub.unsubscribe();
  }

  get view(): ViewType {
    return this._view;
  }
  set view(newView: ViewType) {
    // Reset any state variables:
    this.passwordResetSuccess = false;

    this._view = newView;
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

  resetPassword() {
    if (! this.email) return false;

    this.accountService.passwordReset(this.email, (err) => {
      if (err) {
        // @TODO/rewrite Handle this better, rightnow accountService just pops up an alert
        return;
      }      

      this.passwordResetSuccess = true;
    });
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
