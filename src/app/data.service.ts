import {Injectable} from 'angular2/core';

var Firebase = require('firebase');

import {Logger} from './utils/logger';
import {UserService} from './account/user.service';
import {NotesService} from './notes/';
import {TagsService} from './tags/';

@Injectable()
export class DataService {
  NEW_FEATURE_COUNT: number = 12; // Hard-coded so that it only updates when user actually receives updated code with the features

  private _logger: Logger = new Logger(this.constructor.name);
  private ref: Firebase;
  private rootRef: Firebase;

  constructor(
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService
  ) {
    this.rootRef = new Firebase('https://nutmeg.firebaseio.com/');
  }

  init(uid: string) {
    this.ref = this.rootRef.child('users/' + uid);

    this.ref.once('value', (snapshot) => {
      var data = snapshot.val();
      this._logger.log('Got data:', data);

      if (! data) {
        // Must be a new user - even if existing user deleted everything there would still be object with config and empty nuts/tags
        this.initNewUser();
      }
      else {
        // @TODO This migration happened Jan 2015. Can safely remove this and related code if all users have lastLogin after than, or if we finish off migration manually.
        if (! data.user.idsMigrated) {
          [data.nuts, data.tags] = this.migrateIds(data.nuts, data.tags);
        }

        this.initFromData(data);
      }
    });

  }

  initNewUser() {
    // firstInit();
    // $s.digest.push();

    // also set featuresSeen

    // emailtoID

    // this.initFromData(data);
  }

  initFromData(data) {
    this.notes.init(data.nuts);
    this.tags.init(data.tags);
    this.user.setData(data.user);

    // @TODO/rewrite
    // $s.s.initBindings(data.shortcuts);
    // $s.c.loadSettings(data.settings);

    // $s.users.fetchShareRecipientNames();

    this.handleNewFeatures(data.featuresSeen, () => {
      // gotta wait til new features done before initializing sharing, cause both use modals, which currently overwrite each other rather than queuing up

      // @TODO/rewrite
      // TODO: if sharedWithMeInit resolves to some sharing confirmation modals BEFORE we finish initializing, the modals will be cancelled by `initUI`... really need to queue up modals. but don't want to wait until shared init stuff done before doing initUI, cause otherwise would take forever
      // sharedWithMeInit(snapshot.val().sharedWithMe);
      // initUI();
    });
  }

  /** In user data we keep track of count of features seen, and then compare that to value hard-coded here in JS. if there are new features seen, display them to the user and update their count. */
  handleNewFeatures(featuresSeen: number, cb: Function) {
    if (featuresSeen < this.NEW_FEATURE_COUNT) {
      this._logger.info('[latestFeatures] There are some new features user hasn\'t seen');

      this.rootRef.child('newFeatures').once('value', (snapshot) => {
        this._logger.log('[latestFeatures] Fetched new feautures list');

        var feats = snapshot.val();
        feats.splice(0, featuresSeen); // cuts off the ones they've already seen;

        var list = feats.map(function(val) { return '<li>' + val + '</li>'; }).join('');

        // $s.u.loading = false; // hide full-page login loading spinner so we can show modal // @TODO/rewrite

        // @TODO/rewrite
        // $s.m.alert({
        //   title: 'Since you\'ve been gone...',
        //   bodyHTML: '<p>In addition to tweaks and fixes, here\'s what\'s new:</p><ul>' + list + '</ul><p>As always, you can send along feedback and bug reports from the menu, which is at the bottom right of the page.</p>',
        //   okText: 'Cool',
        //   okCb: cb,
        //   cancelCb: cb,
        //   large: true
        // });
        // for now just:
        alert(feats);

        this.ref.child('/featuresSeen').set(this.NEW_FEATURE_COUNT);

        cb();
      }, function(err) {
        this._logger.error('[latestFeatures] Failed to get new features', err);
        cb();
      });
    }
    else {
      this._logger.log('[latestFeatures] Already seen em');
      cb();
    }
  }

  /** the shift from nuts and tags being arrays to being objects means that all keys are now strings, so tag.docs and nut.tags have to be updated */
  migrateIds(nuts, tags) {
    _.each(nuts, function(nut) {
      nut.id = String(nut.id);
      if (nut.tags && nut.tags.length) {
        nut.tags = nut.tags.map(String);
      }
      // $s.n.nutUpdated(nut, false, false); // @TODO/rewrite
    });
    _.each(tags, function(tag) {
      tag.id = String(tag.id);
      if (tag.docs && tag.docs.length) {
        tag.docs = tag.docs.map(String);
      }
      // $s.t.tagUpdated(tag, false, false); // @TODO/rewrite
    });

    // initNewUser now does this, but for older users:
    this.ref.child('user').update({
      email: this.user.email,
      provider: this.user.provider,
      idsMigrated: true
    }, () => {});

    return [nuts, tags];
  }
}
