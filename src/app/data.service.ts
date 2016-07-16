import {Injectable} from '@angular/core';

const Firebase = require('firebase');

import {Logger, utils} from './utils/';
import {UserService} from './account/user.service';
import {NotesService} from './notes/';
import {TagsService} from './tags/';

@Injectable()
export class DataService {
  NEW_FEATURE_COUNT: number = 12; // Hard-coded so that it only updates when user actually receives updated code with the features

  private _logger: Logger = new Logger(this.constructor.name);
  private ref: Firebase;

  constructor(
    public user: UserService,
    public notes: NotesService,
    public tags: TagsService
  ) {
    this.ref = new Firebase('https://nutmeg.firebaseio.com/');
  }

  init(uid: string) {
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
