import {Injectable} from 'angular2/core';

var Firebase = require('firebase');

@Injectable()
export class DataService {
  data: any = {};

  init(uid: string) {
    var ref = new Firebase('https://nutmeg.firebaseio.com/users/' + uid);

    ref.once('value', (data) => {
      this.data = data.val();
      console.log('data service initialized, got', this.data);
      // debugger;
    });
  }
}
