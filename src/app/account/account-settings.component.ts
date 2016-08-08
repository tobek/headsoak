import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'account-settings',
  styles: [`
  `],
  template: `
    <h1>
      Account Settings!
    </h1>
  `
})
export class AccountSettingsComponent {
  constructor(public route: ActivatedRoute) {

  }

  ngOnInit() {
    console.log('`Account Settings` component initialized');
  }

}
