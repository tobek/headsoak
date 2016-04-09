import {Injectable} from 'angular2/core';

var Firebase = require('firebase');

import {Logger} from './utils/logger';
import {UserService} from './account/user.service';
import {NotesService} from './notes/';
import {TagsService} from './tags/';

@Injectable()
export class DataService {
  data: any = {};

  private _logger: Logger = new Logger(this.constructor.name);
  private ref: Firebase;

  constructor(
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService
  ) {}

  init(uid: string) {
    this.user;
    this.ref = new Firebase('https://nutmeg.firebaseio.com/users/' + uid);

    this.ref.once('value', (snapshot) => {
      this.data = snapshot.val();
      this._logger.log('Initialized, got', this.data);

      if (! this.data) {
        // Must be a new user - even if existing user deleted everything there would still be object with config and empty nuts/tags
        this.initNewUser();
      }
      else {
        this.notes.init(this.data.nuts);
        this.tags.init(this.data.tags);
        // this.user.setData(this.data.user); // @TODO/rewrite should extend

        // MIGRATION @TODO/rewrite
      }

      // @TODO/rewrite
      // $s.s.initBindings(data.val().shortcuts);
      // $s.c.loadSettings(data.val().settings);

      // $s.users.fetchShareRecipientNames();

      // handleNewFeatures(data.val().featuresSeen, function newFeaturesHandled() {
      //   // gotta wait til new features done before initializing sharing, cause both use modals, which currently overwrite each other rather than queuing up

      //   // TODO: if sharedWithMeInit resolves to some sharing confirmation modals BEFORE we finish initializing, the modals will be cancelled by `initUI`... really need to queue up modals. but don't want to wait until shared init stuff done before doing initUI, cause otherwise would take forever
      //   sharedWithMeInit(data.val().sharedWithMe);

      //   initUI();
      // });
    });

  }

  initNewUser() {
    // firstInit();
    // $s.digest.push();

    // emailtoID
  }
}
