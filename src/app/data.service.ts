import {Inject, forwardRef, Injectable, EventEmitter, NgZone, ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';
import {ReplaySubject, Subscription} from 'rxjs';

import {Logger, utils, sampleData} from './utils/';

import {AccountService} from './account';
import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {ToasterService} from './utils/toaster.service';
import {UserService} from './account/user.service';
import {Note, NotesService} from './notes/';
import {Tag} from './tags/';
import {TagsService} from './tags/tags.service';
import {SettingsService} from './settings/settings.service';
import {Setting} from './settings/setting.model';
import {Shortcut} from './settings/shortcut.model';

import * as _ from 'lodash';

declare type DataItem = Note | Tag | Setting | Shortcut;

interface DataDigest {
  'nuts': { [noteId: string]: Note },
  'tags': { [tagId: string]: Tag },
  'settings': { [settingId: string]: Setting | Shortcut },
}

@Injectable()
export class DataService {
  NEW_FEATURE_COUNT = 12; // Hard-coded so that it only updates when user actually receives updated code with the features
  SYNC_THROTTLE = 5000; // As soon as data is updated it is synced to the server after SYNC_DELAY, but immediately-subsequent updates don't trigger a new sync until this time, in ms, has passed
  SYNC_DELAY = 500
  SYNC_ERROR_DELAY = 6000; // How long to wait after an error before trying to sync again

  // online: boolean; // @TODO/rewrite connection widget should show if offline

  /**
   * Fired with initialization state when allll the data is initialized (true) for a logged-in user, or when everything is unloaded (false).
   *
   * In order to fire an event once everything is initialized - which could be now or in the future - you can do:
   *
   *     dataService.initialized$.filter(initialized => !! initialized).first().subscribe(...);
   */
  initialized$ = new ReplaySubject<boolean>(1);

  isInitialized = false;

  digest$ = new EventEmitter<DataItem>();

  statusNameMap = {
    synced: 'synced',
    syncing: 'syncing',
    unsynced: 'unsynced',
    error: 'sync error',
    offline: 'offline',
  };
  _status: 'synced' | 'syncing' | 'unsynced' | 'offline' | 'error' = 'synced';
  get status(): 'synced' | 'syncing' | 'unsynced' | 'offline' | 'error' {
    return this._status;
  }
  set status(newStatus) {
    this.zone.run(() => {
      this._status = newStatus;
    });

    if (newStatus === 'unsynced') {
      setTimeout(this.throttledSync, this.SYNC_DELAY);
    }
    else if (newStatus === 'error') {
      this._logger.log('Error state - syncing again in', this.SYNC_ERROR_DELAY);
      setTimeout(this.throttledSync, this.SYNC_ERROR_DELAY);
    }

    window.removeEventListener('beforeunload', this.confirmLeaving);
    if (newStatus !== 'synced') {
      window.addEventListener('beforeunload', this.confirmLeaving);
    }
  }

  ref: Firebase;

  accountService: AccountService;

  /** This stores data that needs to be synced to server. Checked by this.sync() */
  private digest: DataDigest;
  /** This stores data that is currently being synced to server. */
  private digestSyncing: DataDigest;
  private digestSub: Subscription;
  private throttledSync: Function;
  private cancelThrottledSync: Function;

  private _logger = new Logger(this.constructor.name);

  constructor(
    public zone: NgZone,
    public router: Router,
    public activeUIs: ActiveUIsService,
    public modalService: ModalService,
    public toaster: ToasterService,
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService,
    @Inject(forwardRef(() => SettingsService)) public settings: SettingsService
  ) {
    this.digest = this.getEmptyDigest();
    this.digestSyncing = this.getEmptyDigest();
    this.digestSub = this.digest$.subscribe(this.dataUpdated.bind(this));
    this.throttledSync = _.throttle(this.sync.bind(this), this.SYNC_THROTTLE);
    this.cancelThrottledSync = this.throttledSync['cancel']; // lodash adds this property, which cancels any pending invocations

    // @TODO/rewrite - only do this if in dev mode (also, angular itself running in dev mode? there's a message in console about it. ensure that it runs in prod for prod build)
    window['dataService'] = this;
  }

  ngOnDestroy() {
    this.digestSub.unsubscribe();
  }

  confirmLeaving = (event) => {
    this.sync(); // sync now!
    event.returnValue = 'Are you sure you want to leave? You have unsaved changes.';
    return event.returnValue;
  };

  getDataStoreName(item: DataItem): string {
    if (item instanceof Note) {
      return 'nuts';
    }
    else if (item instanceof Tag) {
      return 'tags';
    }
    else if (item instanceof Setting || item instanceof Shortcut) {
      return 'settings';
    }
  }

  dataUpdated(update: DataItem): void {
    this.digest[this.getDataStoreName(update)][update.id] = update;

    this.status = 'unsynced'; // triggers sync too

    // This function can get called inside change detection loop, and changing this.status is another change which will trigger another round of detection. This blows up in dev mode, so tell Angular/Zone that we need to check for changes now:
    this.accountService.rootChangeDetector.markForCheck();
    // @TODO There is probably something better to do here. A way to trigger this error if necessary is to update a smart tag library tag to set a different value on noteData for already-tagged notes. Then, re-loading page and having it re-run on app load was causing this problem.
    // @TODO/refactor Dang seems like it's still happening, similar cause as above: reloading on smart tag library page with a changed smart tag, in this case changing what's tagged and what's note.
  }

  removeData(dataType: string, id: string) {
    this.status = 'unsynced'; // triggers sync

    if (dataType === 'nut' || dataType === 'note') {
      this.digest.nuts[id] = null;
    }
    else if (dataType === 'tag') {
      this.digest.tags[id] = null;
    }
  }

  getEmptyDigest(): DataDigest {
    return { 'nuts': {}, 'tags': {}, 'settings': {} };
  }
  isDigestEmpty(digest: DataDigest): boolean {
    return (_.isEmpty(digest['nuts']) && _.isEmpty(digest['tags']) && _.isEmpty(digest['settings']));
  }

  isUnsaved(item: DataItem): boolean {
    if (! item) {
      return false;
    }

    const store = this.getDataStoreName(item);

    if (this.digest[store][item.id] !== undefined) {
      return true;
    }
    else if (this.digestSyncing[store][item.id] !== undefined) {
      return true;
    }
    else {
      return false;
    }
  }

  /** We run this throttled. Checks the digest and syncs updates as necessary. */
  sync(): void {
    if (! this.isDigestEmpty(this.digestSyncing)) {
      this._logger.log('sync called while digest is syncing');
      return;
    }

    this._logger.log('Checking if there are changes to sync');

    if (this.isDigestEmpty(this.digest)) {
      this._logger.log('(There aren\'t)');
      this.status = 'synced';
      return;
    }

    this._logger.log('Changes found, syncing');

    // Here we loop through notes, tags, etc. in digest, and for each one process them and update to data store
    _.forEach(this.digest, (contents: { [id: string]: DataItem }, field: string) => {
      if (_.isEmpty(contents)) {
        return;
      }

      let updates = _.mapValues(contents, (item: DataItem ) => {
        // null indicates item has been deleted
        return item === null ? null : item.forDataStore();
      });

      this._logger.log('Updating', field, 'with', updates);

      try {
        this.ref.child(field).update(updates, (err?) => {
          this.zone.run(() => {
            this.syncCb(err, field);
          });
        });
      }
      catch (err) {
        // This is a synchronous error so wait a tick so that the rest of `sync` can run before we run `syncCb`
        setTimeout(() => {
          this.syncCb(err, field);
        }, 0);
      }
    });

    this.status = 'syncing';
    this.digestSyncing = this.digest;
    this.digest = this.getEmptyDigest();
  }

  // Use this and rename existing `syncCb` to `_syncCb` to simulate slow connection
  // syncCb(err, field: string) {
  //   setTimeout(() => {
  //     this._syncCb(err, field);
  //   }, 5000);
  // }

  syncCb(err, field: string): void {
    if (err) {
      this._logger.error('Sync to Firebase threw or returned error:', err);
      const stuffChanged = field === 'nuts' ? 'notes' : field;
      this.toaster.error(
        'Some ' + stuffChanged + ' may not have been saved. We\'ll keep trying though. You can email us at <a href="mailto:support@headsoak.com">support@headsoak.com</a> if this keeps happening.',
        'Error syncing ' + stuffChanged + ' to the cloud',
        {
          preventDuplicates: true,
          timeOut: 10000,
        }
      );
      this.status = 'error'; // triggers sync

      // Merge syncing stuff back into current digest (current digest overrides) and then try to sync it again
      this.digest[field] = _.assign({}, this.digestSyncing[field], this.digest[field]);
      this.digestSyncing[field] = {};

      return;
    }

    this._logger.log('Successfully synced', field);
    this.digestSyncing[field] = {};

    if (this.status !== 'error' && this.isDigestEmpty(this.digestSyncing)) {
      this._logger.log('All fields now synced');

      if (! this.isDigestEmpty(this.digest)) {
        this._logger.log('But updates were made while digest was syncing - syncing again soon');
        this.throttledSync();
      }
      else {
        this.status = 'synced';
      }
    }
  }

  init(uid: string, accountService: AccountService) {
    this.accountService = accountService;
    this.ref = accountService.ref;
    
    // An initial check to see if anything needs updating after initialization (pretty sure this is impossible since we haven't fetched data, but why not):
    this.throttledSync();

    // @TODO/rewrite also sync (without throttle) before unload

    this.fetchData(uid);
  }

  fetchData(uid: string) {
    if (uid === 'OFFLINE') {
      this._logger.log('OFFLINE, USING SAMPLE DATA:', sampleData);
      // this.initFromData(sampleData);
      this.initNewUser();
      this.status = 'offline';
      return;
    }

    this.ref = this.ref.root().child('users/' + uid);

    this.ref.once('value', (snapshot) => { this.zone.run(() => {
      var data = snapshot.val();
      this._logger.log('Got data:', data);

      if (! data || ! data.featuresSeen) {
        // Must be a new user - featuresSeen gets set up for every login
        this.initNewUser();
      }
      else {
        this.initFromData(data);
      }
    })}, (err) => {
      this._logger.error('Failed to fetch data for user ' + uid + ' on app load:', err);
    });

  }

  initNewUser() {
    this._logger.info('Initializing data for new user');

    const userSinceTimestamp = Date.now();

    this.ref.update({
      userSince: userSinceTimestamp, // we have to put this here at top level to be able to do `orderByChild('userSince')` in our Firebase watcher
      user: {
        email: this.user.email,
        provider: this.user.provider,
        idsMigrated2016: true,
        userSince: userSinceTimestamp,
      },
      featuresSeen: this.NEW_FEATURE_COUNT
    }, (err) => {
      if (err) {
        this._logger.error('Error setting new user info:', err);
        return;
      }
    });

    this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(this.user.uid, (err) => {
      this._logger.error('Failed to set emailToId for user ' + this.user.uid, err);
    });


    this.initialized$.filter(val => !! val).first().subscribe(this.newUserPostInit.bind(this));

    this.initFromData({
      nuts: {
        '0': {
          'id':'0',
          'body':'This example note has been automatically tagged with a sentiment analysis "smart tag", because it\'s a really sad miserable horrid awful bad note.\n\nSmart tags are indicated by the wand symbol. You can find more like these in the Smart Tag Library from the Tags screen, and you can even make your own.',
          'created':1475642885139,
          'modified':1475643994229,
        },
        '1': {
          'id':'1',
          'body':'This note has a regular tag. You can remove it by hovering over it and pressing the X icon. You can add more tags by pressing the + button above.',
          'created':1475643969089,
          'modified':1475644103580,
          'tags':['0'],
        },
        '2': {
          'id':'2',
          'body':'Welcome to Headsoak! We\'re delighted to have you. Please click around and explore!',
          'created':1475642863010,
          'modified':1475683264156,
        },
      },
      tags: {
        '0': {
          'id':'0',
          'name':'example tag',
          'created':1475642802518,
          'modified':1475644006309,
          'docs':['1'],
        },
      },
      user: {
        'idsMigrated2016': true
      },
      settings: {},
    });
  }

  newUserPostInit() {
    // Sync starter tags and notes to data store for this new user

    _.each(
      _.filter(this.notes.notes, note => ! note.new),
      note => note.updated(false, false)
    );

    _.each(this.tags.tags, tag => tag.updated(false));

    // Smart tags that are enabled by default for new users:
    this.tags.progTagLibraryService.toggleTagById('lib--sentiment');
    this.tags.progTagLibraryService.toggleTagById('lib--untagged');
  }

  initFromData(data) {
    // In theory we should probably not fire this.initialized$ until all the different services are done, but right now the notes service is the only one that takes any real time (cause it also has to calculate lunr index) so we can just wait for that.
    this.notes.initialized$.first().subscribe(() => {
      this.isInitialized = true;
      this.initialized$.next(true);
    });

    // @NOTE that we have to initalize tags service before notes service because notes service needs to look up tag names for indexing tag field in notes.
    // @TODO Passing ourselves to notes/tags services who in turn pass us to note/tag models is kind of a cruddy paradigm, but it's partially a holdover from first version of nutmeg and really it makes MVP rewrite a lot easier right now, instead of figuring out how to properly listen to updates and propagate changes accordingly.
    this.settings.init(data.settings, this);
    this.tags.init(data.tags, this);
    this.notes.init(data.nuts, this);

    if (data.user.email !== this.user.email) {
      // User has changed their email and this change isn't reflected in data store yet.
      data.user.email = this.user.email;

      this.ref.child('user').update({
        email: this.user.email
      }, (err) => {
        if (err) {
          this._logger.error('Failed to update email ' + this.user.email + ' in user object!', err);
        }
      });
    }
    this.user.setData(data.user);

    // $s.users.fetchShareRecipientNames();

    this.handleNewFeatures(data.featuresSeen, () => {
      // gotta wait til new features done before initializing sharing, cause both use modals, which currently overwrite each other rather than queuing up

      // @TODO/rewrite
      // TODO: if sharedWithMeInit resolves to some sharing confirmation modals BEFORE we finish initializing, the modals will be cancelled by `initUI`... really need to queue up modals. but don't want to wait until shared init stuff done before doing initUI, cause otherwise would take forever
      // sharedWithMeInit(snapshot.val().sharedWithMe);
      // initUI();
    });

    this.handleIdMigration();
  }

  /** In user data we keep track of count of features seen, and then compare that to value hard-coded here in JS. if there are new features seen, display them to the user and update their count. */
  handleNewFeatures(featuresSeen: number, cb: Function) {
    if (featuresSeen < this.NEW_FEATURE_COUNT) {
      this._logger.info('[latestFeatures] There are some new features user hasn\'t seen');

      this.ref.root().child('newFeatures').once('value', (snapshot) => { this.zone.run(() => {
        this._logger.log('[latestFeatures] Fetched new feautures list');

        var feats = snapshot.val();
        feats.splice(0, featuresSeen); // cuts off the ones they've already seen;

        // $s.u.loading = false; // hide full-page login loading spinner so we can show modal // @TODO/rewrite

        // @TODO/rewrite
        // var list = feats.map(function(val) { return '<li>' + val + '</li>'; }).join('');
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
        // @TODO/modals

        this.ref.child('featuresSeen').set(this.NEW_FEATURE_COUNT);

        cb();
      })}, function(err) {
        this._logger.error('[latestFeatures] Failed to get new features', err);
        cb();
      });
    }
    else {
      this._logger.log('[latestFeatures] Already seen em');
      cb();
    }
  }

  /**
   * The shift from notes and tags being arrays to being objects meant that all keys are now strings, so tag.docs and note.tags have to be updated.
   * @TODO This migration happened Jan 2015. Can safely remove this and related code if all users have lastLogin after than, or if we finish off migration manually. @NOTE Actually it seems like the migration didn't work. Updated September 29 2016 and now using `idsMigrated2016` field to try this again. If we get rid of this then we can make Note/Tag `id` properties `readonly` =)
   */
  handleIdMigration() {
    if (this.user.idsMigrated2016) {
      return;
    }

    this._logger.log('Starting ID migration');
    this._logger.time('Fixing number IDs jeez');
    console.groupCollapsed();

    _.each(this.tags.tags, function(tag: Tag) {
      tag.id = String(tag.id);
      tag.docs = tag.docs ? _.map(tag.docs, String) : [];
      tag.updated(false);
    });

    _.each(this.notes.notes, function(note: Note) {
      note.tags = note.tags ? _.map(note.tags, String) : [];
      note.id = String(note.id);
      note.updated(false, false);
    });

    console.groupEnd();
    this._logger.timeEnd('Fixing number IDs jeez');

    // initNewUser now does this, but for older users:
    this.ref.child('user').update({
      email: this.user.email,
      provider: this.user.provider,
      idsMigrated2016: true
    }, (err) => {
      this._logger.error('Failed to update user info when migrating IDs for user ' + this.user.uid, err);
    });
  }

  /** Clears all loaded data. */
  clear(): void {
    this.isInitialized = false;
    this.initialized$.next(false);

    this.notes.clear();
    this.tags.clear();
    this.settings.clear();
    this.user.clear();

    this.cancelThrottledSync();
  }
}
