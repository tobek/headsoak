import {Injectable, EventEmitter, NgZone, ChangeDetectorRef} from '@angular/core';
import {Router} from '@angular/router';
import {ReplaySubject, Subscription} from 'rxjs';

const Firebase = require('firebase');

import {Logger, utils, sampleData} from './utils/';

import {AccountService} from './account';
import {ActiveUIsService} from './active-uis.service';
import {ModalService} from './modals/modal.service';
import {UserService} from './account/user.service';
import {Note, NotesService} from './notes/';
import {Tag, TagsService} from './tags/';
import {SettingsService} from './settings/settings.service';
import {Setting} from './settings/setting.model';
import {Shortcut} from './settings/shortcut.model';

// @TODO/rewrite only do in dev mode
import {FirebaseMock} from './mocks/';

declare type DataItem = Note | Tag | Setting | Shortcut;

@Injectable()
export class DataService {
  NEW_FEATURE_COUNT = 12; // Hard-coded so that it only updates when user actually receives updated code with the features

  online: boolean; // @TODO/rewrite connection widget should show if offline

  /** Fired with initialization state when allll the data is initialized, or when everything is unloaded. */
  initialized$ = new ReplaySubject<boolean>(1);

  digest$ = new EventEmitter<DataItem>();

  status: string; // 'synced' | 'syncing' | 'unsynced' | 'disconnected'

  ref: Firebase | FirebaseMock;

  accountService: AccountService;

  /** This stores data that needs to be synced to server. Periodically checked by this.sync() */
  private digest: {
    'nuts': { [key: string]: Note },
    'tags': { [key: string]: Tag },
    'settings': { [key: string]: Setting | Shortcut },
  };
  private digestSub: Subscription;

  /** How many separate async callbacks to sync data to data store we're currently waiting on. Using `parallel` from `async` module would be more elegant, but we don't need anything else from that module right now and source code for that function simply keeps a counter of the number of tasks that have completed, so it's the same idea. */
  private syncTasksRemaining = 0;

  private syncInterval;

  private _logger = new Logger(this.constructor.name);
  private onlineStateRef: Firebase | FirebaseMock;

  constructor(
    public ngZone: NgZone,
    public router: Router,
    public activeUIs: ActiveUIsService,
    public modalService: ModalService,
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService,
    public settings: SettingsService
  ) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');

    this.digestReset();
    this.digestSub = this.digest$.subscribe(this.dataUpdated.bind(this));

    // @TODO/rewrite - only do this if in dev mode (also, angular itself running in dev mode? there's a message in console about it. ensure that it runs in prod for prod build)
    window['dataService'] = this;
  }

  ngOnDestroy() {
    this.digestSub.unsubscribe();
  }

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

    this.status = 'unsynced';

    // This function can get called inside change detection loop, and changing this.status is another change which will trigger another round of detection. This blows up in dev mode, so tell Angular/Zone that we need to check for changes now:
    this.accountService.rootChangeDetector.markForCheck();
    // @TODO There is probably something better to do here. A way to trigger this error if necessary is to update a smart tag library tag to set a different value on noteData for already-tagged notes. Then, re-loading page and having it re-run on app load was causing this problem.
    // @TODO/refactor Dang seems like it's still happening, similar cause as above: reloading on smart tag library page with a changed smart tag, in this case changing what's tagged and what's note.
  }

  removeData(dataType: string, id: string) {
    if (dataType === 'nut' || dataType === 'note') {
      this.digest.nuts[id] = null;
    }
    else if (dataType === 'tag') {
      this.digest.tags[id] = null;
    }
  }

  digestReset(): void {
    this.digest = { 'nuts': {}, 'tags': {}, 'settings': {} };
    this.status = 'synced'; // @TODO/rewrite Make sure sync status widget updates
  }

  isUnsaved(item: DataItem): boolean {
    if (! item) {
      return false;
    }
    return this.digest[this.getDataStoreName(item)][item.id] !== undefined;
  }

  /** We run this on an interval. Checks the digest and syncs updates as necessary. */
  sync(): void {
    if (this.syncTasksRemaining > 0) return; // currently syncing

    this._logger.log('Checking for changes to sync');

    // Here we loop through notes, tags, etc. in digest, and for each one process them and update to data store
    let updated = false;
    _.forEach(this.digest, (contents: { [key: string]: DataItem }, field: string) => {
      if (_.isEmpty(contents)) {
        return;
      }

      this.syncTasksRemaining++;

      let updates = _.mapValues(contents, (item: DataItem ) => {
        // null indicates item has been deleted
        return item === null ? null : item.forDataStore();
      });

      this._logger.log('Updating', field, 'with', updates);
      this.status = 'syncing';
      updated = true;

      this.ref.child(field).update(updates, this.syncCb.bind(this));
    });

    if (updated) {
      this._logger.log('Changes found, syncing');
    }
    else if (this.status !== 'synced') {
      this.status = 'synced';
    }
  }

  syncCb(err): void {
    this.syncTasksRemaining--;

    if (err) {
      alert('Error syncing your notes to the cloud! Some stuff may not have been saved. We\'ll keep trying though. You can email me at toby@headsoak.com if this keeps happening. Tell me what this error says:\n\n' + JSON.stringify(err));
      this.status = 'disconnected'; // @TODO/rewrite Make sure sync status widget updates
      return;
    }

    if (this.syncTasksRemaining === 0) {
      this._logger.log('Changes pushed successfully');
      this.digestReset();
    }
  }

  init(uid: string, accountService: AccountService) {
    this.accountService = accountService;
    
    // Sync to server (if there are any changes) every 5s
    this.syncInterval = window.setInterval(this.sync.bind(this), 5000);
    // @TODO/rewrite also sync before unload

    // @TODO in theory this is where, later, we can listen for connection state always and handle online/offline. For now we have an offline mode just when on local
    let onlineStateTimeout;
    if (document.location.href.indexOf('localhost') !== -1){
      onlineStateTimeout = window.setTimeout(this.offlineHandler.bind(this), 5000);
    }
    
    this.onlineStateRef = this.ref.root().child('.info/connected');
    this.onlineStateRef.on('value', (snap) => {
      this.online = snap.val();
      this._logger.log('Online:', this.online);

      if (this.online) {
        if (onlineStateTimeout) {
          window.clearTimeout(onlineStateTimeout);
        }

        this.onlineStateRef.off();
        this.fetchData(uid);
      }
    });
  }

  offlineHandler() {
    this._logger.log('Still offline after 5 seconds');
    this.onlineStateRef.off();

    // @TODO/rewrite This should be dev only, otherwise should init from localStorage or something
    // @TODO/rewrite When it's no longer dev only, this.status needs to indicate offline.
    this._logger.log('OFFLINE, USING SAMPLE DATA:', sampleData);
    this.initFromData(sampleData);

    this.ref = new FirebaseMock;
  }

  fetchData(uid: string) {
    this.ref = this.ref.root().child('users/' + uid);

    this.ref.once('value', (snapshot) => {
      var data = snapshot.val();
      this._logger.log('Got data:', data);

      if (! data.user || ! data.user.provider) {
        // Must be a new user - user object is set up with `provider` when new user is initialized
        this.initNewUser();
      }
      else {
        this.initFromData(data);
      }
    });

  }

  initNewUser() {
    this._logger.info('Initializing data for new user');

    this.ref.child('user').update({
      email: this.user.email,
      provider: this.user.provider,
      idsMigrated2016: true,
    }, (err) => {
      if (err) {
        this._logger.error('Error setting new user info:', err);
        return;
      }
    });

    this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(this.user.uid);

    this.ref.child('featuresSeen').set(this.NEW_FEATURE_COUNT);

    // @TODO/rewrite Also make sure that IDs in sample data are all strings

    // $s.n.nuts = {};
    // $s.n.nutsDisplay = [];
    // $s.t.tags = [];

    // // load dummy data
    // $s.t.createTags([{name: "quote"},{name: "sample notes"},{name: "futurism"}]);
    // $s.n.createNuts([{
    //   body: "\"There are six people living in space right now. There are people printing prototypes of human organs, and people printing nanowire tissue that will bond with human flesh and the human electrical system.\n\n\"We’ve photographed the shadow of a single atom. We’ve got robot legs controlled by brainwaves. Explorers have just stood in the deepest unsubmerged place in the world, a cave more than two kilometres under Abkhazia. NASA are getting ready to launch three satellites the size of coffee mugs, that will be controllable by mobile phone apps.\n\n\"Here’s another angle on vintage space: Voyager 1 is more than 11 billion miles away, and it’s run off 64K of computing power and an eight-track tape deck.\n\n\"The most basic mobile phone is in fact a communications device that shames all of science fiction, all the wrist radios and handheld communicators. Captain Kirk had to tune his fucking communicator and it couldn’t text or take a photo that he could stick a nice Polaroid filter on. Science fiction didn’t see the mobile phone coming. It certainly didn’t see the glowing glass windows many of us carry now, where we make amazing things happen by pointing at it with our fingers like goddamn wizards.\n\n\"...The central metaphor is magic. And perhaps magic seems an odd thing to bring up here, but magic and fiction are deeply entangled, and you are all now present at a séance for the future.\"\n\n- Warren Ellis, [How to see the Future](http://www.warrenellis.com/?p=14314)",
    //   tags: [0,1,2]
    // },
    // {
    //   body: "Here is my todo list of things to implement in Nutmeg in the very near future:\n\n- Customizeable programmatic tagging\n- Sharing and live collaboration\n- Customizeable layouts\n- Fix weird font sizes\n- Responsive design: usable on all different sizes of devices\n- Any design at all\n- SSL\n- Private notes\n\nPotential avenues for future feature-bloat:\n\n- Tag jiggery\n  - (Auto-suggested) tag relationships, sequences, and modifiers\n  - Auto-tagging and API for programmatic tagging - tagging based output of arbitrary functions, like...\n    - Classifiers trained on what you've tagged so far\n    - Sentiment analysis and other computational linguistics prestidigitation like unusual concentrations of domain-specific words\n    - # or % of lines matching given regex\n    - Categorizations like the Flesch Reading Ease test\n    - Whatever your little heart desires\n- Markdown, Vim, syntax highlighting, and WYSIWYG support\n- Integration with...\n  - Email\n  - Instant messaging protocols\n- Shortcuts and visualizations for non-linear writing - think LaTeX meets [XMind](http://www.xmind.net/)\n- Plugin API and repository\n- Autodetecting (encouraging, formalizing, visualizing) user-generated on-the-fly syntax\n- Media support\n- Life logging\n- Exporting, web-hooks, integration with: IFTTT, Zapier, WordPress...\n- Legend/You Are Here minimap",
    //   tags: [1]
    // },
    // {
    //   body: "Hey, welcome to Nutmeg. These are your personal notes, accessible by you from anywhere. Here are some things you can do with Nutmeg:\n\n- Write notes\n- Tag notes\n- Everything is synced to the cloud within seconds: you write, it's saved, kind of like paper.\n- See and edit your notes from any device\n- Instant searching through your notes, by tag and by keyword\n\nYou can delete notes by hitting the trash can in the top right of each note. You can figure out how to edit and delete tags.\n\nNutmeg is under active development, so bear with me on any weirdness. In the menu in the lower right corner of the screen you can log out, view/customize keyboard shortcuts, and submit any bug reports, feature requests, or thoughts as feedback, which I hope you do.",
    //   tags: [1]
    // }]);

    // $s.digest.push();

    // this.initFromData(data);

    // For now:
    this.initFromData({
      notes: {},
      tags: {},
      user: {},
      settings: {},
    });
  }

  initFromData(data) {
    // In theory we should probably not fire this.initialized$ until all the different services are done, but right now the notes service is the only one that takes any real time (cause it also has to calculate lunr index) so we can just wait for that.
    this.notes.initialized$.first().subscribe(() => {
      this.initialized$.next(true);
    });

    // @NOTE that we have to initalize tags service before notes service because notes service needs to look up tag names for indexing tag field in notes.
    // @TODO Passing ourselves to notes/tags services who in turn pass us to note/tag models is kind of a cruddy paradigm, but it's partially a holdover from first version of nutmeg and really it makes MVP rewrite a lot easier right now, instead of figuring out how to properly listen to updates and propagate changes accordingly.
    this.settings.init(data.settings, this);
    this.tags.init(data.tags, this);
    this.notes.init(data.nuts, this);

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

      this.ref.root().child('newFeatures').once('value', (snapshot) => {
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

        this.ref.child('featuresSeen').set(this.NEW_FEATURE_COUNT);

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

  /**
   * The shift from notes and tags being arrays to being objects meant that all keys are now strings, so tag.docs and note.tags have to be updated.
   * @TODO This migration happened Jan 2015. Can safely remove this and related code if all users have lastLogin after than, or if we finish off migration manually. @NOTE Actually it seems like the migration didn't work. Updated September 29 2016 and now using `idsMigrated2016` field to try this again.
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
    }, () => {});
  }

  /** Clears all loaded data. */
  clear(): void {
    this.initialized$.next(false);

    this.notes.clear();
    this.tags.clear();
    this.settings.clear();
    this.user.clear();

    clearInterval(this.syncInterval);
  }
}
