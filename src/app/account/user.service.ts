import {Injectable} from 'angular2/core';

@Injectable()
export class UserService {
  loggedIn: boolean = false;
  uid: string;
  email: string;
  provider: string;

  setData(authData: any) {
    this.uid = authData.uid;
    this.provider = authData.provider;
    if (authData[this.provider] && authData[this.provider].email) {
      this.email = authData[this.provider].email;
    }
  }

  clear() {
    this.loggedIn = false;
    this.uid = null;
    this.email = null;
    this.provider = null;
  }
}
