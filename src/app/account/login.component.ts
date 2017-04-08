import {Component, NgZone, ViewChild, ElementRef} from '@angular/core';
import {Subscription} from 'rxjs';

import {AccountService} from './account.service';
import {Logger, TooltipService} from '../utils/';

import * as _ from 'lodash';


type ViewType = 'email-signup' | 'login' | 'create-account' | 'reset-password';

@Component({
  selector: 'login',
  templateUrl: './login.component.html'
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  pass1: string = '';
  pass2: string = '';
  _view: ViewType;

  @ViewChild('signInButton') signInButton: ElementRef;
  @ViewChild('signUpButton') signUpButton: ElementRef;
  @ViewChild('resetPasswordButton') resetPasswordButton: ElementRef;

  public SENDGRID_DATA_TOKEN = 'GToz%2FEw5QP9JUKCujIHPy3uDXh8mcHwhIymBkDxrMpP5rzzMvgY6EHjUBqPVOkfv%2Fydfh8p7VoOBnGyYPQDgmcy5t%2BiHV%2B7u71%2F0tMVNo%2FU%3D';

  public isLoading = false;

  private loginSub: Subscription;

  private _logger: Logger = new Logger('LoginComponent');

  constructor(
    private el: ElementRef,
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

    // @TODO/soon Temporary function to let us create accounts!
    if (! this.accountService['dataService']['createAccount']) {
      this.accountService['dataService']['createAccount'] = () => {
        this.view = 'create-account';
      };
    }
  }

  ngOnDestroy() {
    this.loginSub.unsubscribe();
    this.clearEmailSignup();
  }

  get view(): ViewType {
    return this._view;
  }
  set view(newView: ViewType) {
    this.isLoading = false;
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
    const protocol = /^http:/.test(document.location + '') ? 'http' : 'https';

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

    const $widget = jQuery(this.el.nativeElement).find('div.sendgrid-subscription-widget');
    $widget.on('error', () => {
      $widget.find('.response.error').hide();

      const name = $widget.find('[name=a]').val();
      const email = $widget.find('[name=email]').val();

      if (! name || ! email) {
        return;
      }

      if (window['hsSubbedEmail'] === email) {
        return;
      }

      window['hsSubbedEmail'] = email;

      console.log('SUBSCRIBE', name, email, $widget, jQuery);


      this.accountService.ref.root().child('emailSubHack').push({
        name: name,
        email: email,
      }, (err?) => {
        if (err) {
          this._logger.error('Subscribe hack failed:', err);
          $widget.find('.response.error').show();
          return;
        }
        this._logger.info('Successfully pushed sub hack');
        $widget.find('.response.error').hide();
        jQuery(this.el.nativeElement).find('.response.success.hack').fadeIn(200);
      });
    });
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
      if (errMessage) {
        this.tooltipService.justTheTip(errMessage, this.signInButton.nativeElement, 'error');
      }
    });

    this.pseudoLogin(loginIframe);
  }

  /** Shenanigans needed to get Chrome to offer to remember password. Copies credentials into pseudo-login.html inside iframe and submit it, since Chrome requires actual form submission and page load before it offers to remember. pseudo-login.html is also used as form `action` - `about:blank` and cancelling submission didn't work. */
  pseudoLogin (loginIframe: HTMLIFrameElement) {
    const loginIframeDoc = loginIframe.contentWindow ? loginIframe.contentWindow.document : loginIframe.contentDocument;

    const emailInput: HTMLInputElement = <HTMLInputElement> loginIframeDoc.getElementById('email');
    const passwordInput: HTMLInputElement = <HTMLInputElement> loginIframeDoc.getElementById('password');
    const loginForm: HTMLFormElement = <HTMLFormElement> loginIframeDoc.getElementById('login-form');

    emailInput.value = this.email;
    passwordInput.value = this.password;
    loginForm.submit();
  }

  resetPassword() {
    if (! this.email) {
      return false;
    }

    this.isLoading = true;

    this.accountService.passwordReset(this.email, (errMessage?: string) => {
      this.isLoading = false;

      if (errMessage) {
        this.tooltipService.justTheTip(errMessage, this.resetPasswordButton.nativeElement, 'error');
        return;
      }

      this.tooltipService.justTheTip(
        'If there\'s an account registered under <b>' + _.escape(this.email) + '</b>, then an email is on its way!',
        this.resetPasswordButton.nativeElement,
        'success',
        null // don't fade until they click
      );
      this.email = '';
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
      if (errMessage) {
        this.tooltipService.justTheTip(errMessage, this.signUpButton.nativeElement, 'error');
      }
    });
  }
}
