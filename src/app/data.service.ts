import {Injectable, EventEmitter} from '@angular/core';
import 'rxjs/add/operator/debounceTime';

const Firebase = require('firebase');

import {Logger, utils, sampleData} from './utils/';
import {UserService} from './account/user.service';
import {Note, NotesService} from './notes/';
import {Tag, TagsService} from './tags/';

// @TODO/rewrite only do in dev mode
import {FirebaseMock} from './mocks/';

@Injectable()
export class DataService {
  NEW_FEATURE_COUNT= 12; // Hard-coded so that it only updates when user actually receives updated code with the features

  online: boolean; // @TODO/rewrite connection widget should show if offline

  digest$ = new EventEmitter<Note | Tag>();

  status: string; // 'synced' | 'syncing' | 'unsynced' | 'disconnected'

  /** This stores data that needs to be synced to server. Periodically checked by this.sync() */
  private digest: {
    'notes': { [key: string]: Note },
    'tags': { [key: string]: Tag },
    'config': { [key: string]: Object }, // @TODO/rewrite - and also change in `sync` below
  };

  /** @HACK instead of figuring out how to get Firebase update() to return promises, or instead of using jQuery deferreds, this counter is incremented when we invoke update on Firebase ref (e.g. once for notes, once for tags, etc.) and decremented when callback happens - if we reach 0, we're done. i think the worst-case scenario is that cb is called really quickly, so we go from 0-1-0-1-0 instead of 0-1-2-1-0, but that's kind of okay */
  private syncHackCounter = 0;

  /** Properties that should not be synced to online store - map of field -> array of props */
  private SYNC_EXCLUDE_PROPS = {
    'notes': ['sharedBody'],
    'tags': ['shareTooltip'],
  };

  private _logger = new Logger(this.constructor.name); // @TODO/rewrite why is typescript raising a fuss here? check that x-browser compatible and see if there's a better way
  private ref: Firebase;
  private onlineStateRef: Firebase;

  constructor(
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService
  ) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');

    this.digestReset();
    this.digest$
      .debounceTime(250) // @TODO/rewrite there should be a max timeout like lodash uses, otherwise continuous edits every 1/4 second won't get saved until you stop
      .subscribe(this.dataUpdated.bind(this));

    // @TODO/rewrite - only do this if in dev mode (also, angular itself running in dev mode? there's a message in console about it. ensure that it runs in prod for prod build)
    window['dataService'] = this;

    window['digest$'] = this.digest$; // @TODO This is a lame, horrid paradigm, a holdover from original version of Nutmeg, and honestly just not sure what the best way is to listen to data updates without just hooking into an app-wide broadcast and not worth the time to do it right now. It works.
  }

  dataUpdated(update: Note | Tag): void {
    if (update instanceof Note) {
      this.digest.notes[update.id] = update;
    }
    else if (update instanceof Tag) {
      this.digest.tags[update.id] = update;
    }

    this.status = 'unsynced';
  }

  digestReset(): void {
    this.digest = { 'notes': {}, 'tags': {}, 'config': {} };
    this.status = 'synced'; // @TODO/rewrite Make sure sync status widget updates
  }

  /** We run this on an interval. Checks the digest and syncs updates as necessary. */
  sync(): void {
    if (this.syncHackCounter > 0) return; // currently syncing

    this._logger.log('Checking for changes to push');

    // Here we loop through notes, tags, etc. in digest, and for each one process them and update to data store
    let updated = false;
    _.forEach(this.digest, (contents: { [key: string]: Note | Tag | Object }, field: string) => {
      if (_.isEmpty(contents)) {
        return;
      }

      this.syncHackCounter++;

      // Make a copy of contents from digest (so that we can remove SYNC_EXCLUDE_PROPS from it)
      let updates = _.extend({}, contents);

      // Now we have to go through every prop of every obj and strip out anything from SYNC_EXCLUDE_PROPS
      if (this.SYNC_EXCLUDE_PROPS[field]) {
        _.forEach(updates, (obj: Note | Tag | Object) => {
          if (! obj) return; // could be null: deleting the value from data store
          this.SYNC_EXCLUDE_PROPS[field].forEach((prop: string) => {
            if (obj[prop] !== undefined) {
              delete obj[prop];
            }
          });
        });
      }

      this.status = 'syncing';
      this._logger.log('Updating', field, 'with', updates);
      this.ref.child(field).update(updates, this.syncCb.bind(this));
      updated = true;
    });

    if (updated) {
      this._logger.log('Changes found, syncing');
    }
    else if (this.status !== 'synced') {
      this.status = 'synced'; // @TODO/rewrite Make sure sync status widget updates
    }
  }

  syncCb(err): void {
    this.syncHackCounter--;

    if (err) {
      alert('Error syncing your notes to the cloud! Some stuff may not have been saved. We\'ll keep trying though. You can email me at toby@nutmeg.io if this keeps happening. Tell me what this error says:\n\n' + JSON.stringify(err));
      this.status = 'disconnected'; // @TODO/rewrite Make sure sync status widget updates
      return;
    }

    if (this.syncHackCounter === 0) {
      this._logger.log('Changes pushed successfully');
      this.digestReset();
    }
  }

  init(uid: string) {
    // Sync to server (if there are any changes) every 2.5s
    window.setInterval(this.sync.bind(this), 2500);
    // @TODO/rewrite also sync before unload

    // @TODO in theory this is where, later, we can listen for connection state always and handle online/offline
    let onlineStateTimeout = window.setTimeout(this.offlineHandler.bind(this), 2500);
    this.onlineStateRef = this.ref.child('.info/connected');
    this.onlineStateRef.on('value', (snap) => {
      this.online = snap.val();
      this._logger.log('Online:', this.online);

      if (this.online) {
        window.clearTimeout(onlineStateTimeout);
        this.onlineStateRef.off();
        this.fetchData(uid);
      }
    });
  }

  offlineHandler() {
    this._logger.log('Still offline after 2.5 seconds');
    this.onlineStateRef.off();

    // @TODO/rewrite This should be dev only, otherwise should init from localStorage or something
    // @TODO/rewrite When it's no longer dev only, this.status needs to indicate offline.
    this._logger.log('OFFLINE, USING SAMPLE DATA:', sampleData);
    this.initFromData(sampleData);

    this.ref = new FirebaseMock;
  }

  fetchData(uid: string) {
    this.ref = this.ref.child('users/' + uid);

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
    this._logger.info('Initializing data for new user');

    this.ref.child('user').update({
      email: this.user.email,
      provider: this.user.provider
    }, (err) => {
      if (err) {
        this._logger.error('Error setting new user info:', err);
        return;
      }
    });

    this.ref.root().child('emailToId/' + utils.formatForFirebase(this.user.email)).set(this.user.uid);

    this.ref.child('featuresSeen').set(this.NEW_FEATURE_COUNT);

    // @TODO/rewrite

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
      user: {}
    });
  }

  initFromData(data) {
    // @NOTE that we have to initalize tags service before notes service because notes service needs to look up tag names for indexing tag field in notes.
    this.tags.init(data.tags);
    this.notes.init(data.nuts);

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
