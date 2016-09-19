import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

import {SettingsComponent} from '../settings';

@Component({
  selector: 'account-settings',
  directives: [
    SettingsComponent
  ],
  template: `
    <h1>
      Account Settings
    </h1>

    <settings></settings>

    <!-- @TODO/rewrite This doesn't work obvs, but we can pass the message on. -->
    <a (click)="loginComponent.deleteAccount()">Delete account</a>
  `
})
export class AccountSettingsComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`Account Settings` component initialized');
  }

}
