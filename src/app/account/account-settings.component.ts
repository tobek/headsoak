import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'account-settings',
  styles: [`
  `],
  template: `
    <h1>
      Account Settings
    </h1>
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
