import {Component, NgZone, ViewChild, ElementRef} from '@angular/core';
import {Subscription} from 'rxjs';

import {AccountService} from './account.service';
import {TooltipService} from '../utils/';


type ViewType = 'email-signup' | 'login' | 'create-account' | 'reset-password';

@Component({
  selector: 'login',
  template: require('./login.component.html')
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  pass1: string = '';
  pass2: string = '';
  _view: ViewType;

  passwordResetSuccess = false;

  @ViewChild('signInButton') signInButton: ElementRef;
  @ViewChild('signUpButton') signUpButton: ElementRef;

  private SENDGRID_DATA_TOKEN = 'GToz%2FEw5QP9JUKCujIHPy3uDXh8mcHwhIymBkDxrMpP5rzzMvgY6EHjUBqPVOkfv%2Fydfh8p7VoOBnGyYPQDgmcy5t%2BiHV%2B7u71%2F0tMVNo%2FU%3D';

  private isLoading = false;

  private loginSub: Subscription;

  constructor(
    private accountService: AccountService,
    private tooltipService: TooltipService,
    private zone: NgZone
  ) {}

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
            if (this.accountService.wasLoggedIn) {
              this.view = 'login';
            }
            else {
              // this.view = 'create-account';
              this.view = 'email-signup';
            }
            break;
          case 'error':
            // Don't change the view
            break;
          default:
            // this.view = 'create-account';
            this.view = 'email-signup';
            break;
          }
      });
    });
  }

  ngOnDestroy() {
    this.loginSub.unsubscribe();
    this.clearEmailSignup();
  }

  get view(): ViewType {
    return this._view;
  }
  set view(newView: ViewType) {
    // Reset any state variables:
    this.passwordResetSuccess = false;

    this._view = newView;

    if (newView === 'email-signup') {
      setTimeout(this.setUpEmailSignup.bind(this), 50);
    }
    else {
      this.clearEmailSignup();
    }
  }

  /** Adapted from sendgrid's legacy newsletter subscribe widget */
  setUpEmailSignup() {
    const id = 'sendgrid-subscription-widget-js';
    const firstScript = document.getElementsByTagName('script')[0];
    const protocol = /^http:/.test(document.location + '') ? "http" : "https";

    // Shitty responsiveness hack in JS - change subscribe button text to match extra copy when on mobile
    const screenWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    if (screenWidth <= 768) {
      jQuery('.sendgrid-subscription-widget').attr('data-submit-text', 'Subscribe');
    }

    if (! document.getElementById(id)) {
      const js = document.createElement('script');
      js.id = id;
      js.src = protocol + '://s3.amazonaws.com/subscription-cdn/0.2/widget.min.js';
      firstScript.parentNode.insertBefore(js, firstScript);
    }
  }
  clearEmailSignup() {
    const script = document.getElementById('sendgrid-subscription-widget-js');
    if (script) {
      script.remove();
    }
  }

  resetInputs() {
    this.email = '';
    this.password = '';
    this.pass1 = '';
    this.pass2 = '';
  }

  login(loginIframe: HTMLIFrameElement) {
    this.isLoading = true;
    // Have to skip 1 since it's a replay subject and we only care about the next state
    this.accountService.loginState$.skip(1).first().subscribe(() => {
      this.isLoading = false;
    });

    this.accountService.login(this.email, this.password, (errMessage: string) => {
      this.tooltipService.justTheTip(errMessage, this.signInButton.nativeElement, 'error');
    });

    this.pseudoLogin(loginIframe);
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
    if (! this.email) {
      return false;
    }

    this.accountService.passwordReset(this.email, (err) => {
      if (err) {
        // @TODO/rewrite Handle this better, right now accountService just pops up an alert
        return;
      }      

      this.passwordResetSuccess = true;
    });
  }

  createAccount() {
    this.isLoading = true;
    // Have to skip 1 since it's a replay subject and we only care about the next state
    this.accountService.loginState$.skip(1).first().subscribe(() => {
      this.isLoading = false;
    });

    // We've removed double password entry for signup
    // if (this.pass1 !== this.pass2) {
    //   alert('Those passwords don\'t match!');
    //   return;
    // }

    this.accountService.createAccount(this.email, this.pass1, (errMessage) => {
      this.tooltipService.justTheTip(errMessage, this.signUpButton.nativeElement, 'error');
    });
  }
}
