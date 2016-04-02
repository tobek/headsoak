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

  ngOnInit() {
  }

  login() {
    this.accountService.login(this.email, this.password);
  }
}
