import {Injectable} from 'angular2/core';
var Firebase = require('firebase');

import {DataService} from './data.service';

@Injectable()
export class AccountService {
  uid: string =  '';

  constructor(private dataService: DataService) {
  }

  login(email: string, password: string) {
    var ref = new Firebase('https://nutmeg.firebaseio.com/');
    ref.authWithPassword({
      email: email,
      password: password,
    }, (error, authData) => {
      if (error) {
        console.warn('login failed', error);
        return;
      }

      console.log('login succeeded');

      this.uid = authData.uid;
      this.dataService.init(this.uid);
    });
  }
}
