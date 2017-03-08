import {Component, ViewChild, ElementRef, HostBinding} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Logger, utils} from '../utils/';

import {Note, NoteComponent} from '../notes/';
import {Tag, ChildTag, ProgTagLibraryService, ProgTagApiService} from '../tags/';
import {DataService} from '../data.service';
import {ForceGraph} from '../utils/force-graph.component';

import * as _ from 'lodash';
import * as jQuery from 'jquery';

type SceneType = {
  function: Function, // gets bound to HomepageComponent
  text?: string,
  // addTag?: string,
  // removeTag?: string,
  manualAddTag?: string,
  delay?: number, // delay before next scene in script
  speed?: number, // divisor of delays in writing
};

@Component({
  selector: 'homepage',
  providers: [ ],
  templateUrl: './homepage.component.html'
})
export class HomepageComponent {
  tags: Tag[] = [];

  stealFocus = true;

  // @HostBinding('class.is--tag-explore-stage') tagExploreStage = false;
  showVis = false;

  @ViewChild('demoNoteRef') demoNoteRef: NoteComponent;
  demoNoteBody: HTMLInputElement;
  demoNoteAddTagInput: HTMLInputElement;


  // @TODO/refactor This is fucking stupid. May be better to spin up real version of DataService and initialize it with fake data, and then clear when user logs in. But that may be even more difficult than this route.
  fakeDataService = {
    'digest$': {
      emit: function() {},
    },
    notes: {
      updateNoteInIndex: function() {},
      'noteUpdated$': {
        next: function() {},
      },
    },
    tags: {
      tags: {},
      getTagByName: function(name) {
        return _.find(this.tags, { name: name });
      },
      createTag: (data) => {
        if (! data.id) {
          data.id = Math.random() + '';
        }
        const constructor = data.parentTagId ? ChildTag : Tag;
        const tag = new constructor(data, this.fakeDataService);
        this.fakeDataService.tags.tags[tag.id] = tag;
        return tag;
      },
      createNewChildTag: function(childTagName: string, parentTag: Tag) {
        const tagData = {
          childTagName: childTagName,
          parentTagId: parentTag.id,
          prog: parentTag.prog,
          fromLib: parentTag.fromLib,
          readOnly: parentTag.readOnly,
        };
        return this.createTag(tagData);
      },
      removeTag: function() {},
      progTagApi: this.progTagApi,
    },
    settings: {
      get: function() {},
    },
    toaster: {
      error: function() {},
    },
  } as any as DataService;

  libraryTags = ['lib--auto', 'lib--sentiment', 'lib--has-quote'];
  tagData = [
    { childTagName: 'positive', parentTagId: 'lib--sentiment' },
    { childTagName: 'negative', parentTagId: 'lib--sentiment' },

    { childTagName: 'tag', parentTagId: 'lib--auto' },
    { childTagName: 'note', parentTagId: 'lib--auto' },
    { childTagName: 'learning', parentTagId: 'lib--auto' },
    { childTagName: 'sentiment', parentTagId: 'lib--auto' },
    { childTagName: 'insights', parentTagId: 'lib--auto' },

    // { name: 'location', prog: true, classifier: true },
    // { childTagName: 'Gaia Cafe', parentTagId: this.tagLoc.id, prog: true },

    // { name: 'quote', prog: true, classifier: true },
    { id: 'sd', name: 'self destruct', prog: true },
    { id: 'rt', name: 'remember this', prog: true },

    // { id: 'fut', name: 'futurism' },
    // { name: '@napoleon', share: true },
    // { name: 'post to blog', prog: true },
  ];

  staticNote1Tags: Tag[];
  staticNote2Tags: Tag[];

  demoNote = new Note({ id: '0' }, this.fakeDataService);

  tagGraph: ForceGraph = {
    nodes: [
      { size: 16, id: '1', name: 'futurism' },
      { size: 5, id: '2', classAttr: 'is--prog', name: 'quote' },
      { size: 4, id: '3', classAttr: 'is--prog', name: 'link' },
      { size: 3, id: '4', name: '@Napoleon' },
      { size: 1, id: '5', name: 'isaac asimov' },
      { size: 2, id: '6', name: 'technology' },
      { size: 1, id: '7', name: 'AI' },
      { size: 1, id: '8', name: 'language' },
      { size: 1, id: '9', name: 'image recognition' },
      { size: 1, id: '10', name: 'sleep' },
      { size: 1, id: '11', name: 'bio-tech' },
      { size: 3, id: '12', classAttr: 'is--prog', name: 'post to blog' },
      { size: 1, id: '13', classAttr: 'is--prog', name: 'location: cafe gaia' },
      { size: 3, id: 'sent:pos', classAttr: 'is--prog', name: 'sentiment: positive' },
      { size: 2, id: 'sent:neg', classAttr: 'is--prog', name: 'sentiment: negative' },
    ],
    links: [
      { source: 'sent:pos', target: '2', weight: 1 },
      { source: 'sent:pos', target: '11', weight: 1 },
      { source: 'sent:pos', target: '10', weight: 1 },
      { source: 'sent:pos', target: '1', weight: 4 },
      { source: 'sent:neg', target: '1', weight: 1 },
      { source: '4', target: '3', weight: 1 },
      { source: '4', target: '2', weight: 1 },
      { source: '4', target: '1', weight: 3 },
      { source: '3', target: '2', weight: 1 },
      { source: '3', target: '1', weight: 8 },
      { source: '2', target: '1', weight: 5 },
      { source: '5', target: '2', weight: 1 },
      { source: '5', target: '1', weight: 1 },
      { source: '6', target: '1', weight: 3 },
      { source: '6', target: '3', weight: 1 },
      { source: '7', target: '6', weight: 1 },
      { source: '7', target: '3', weight: 1 },
      { source: '7', target: '1', weight: 1 },
      { source: '9', target: '8', weight: 1 },
      { source: '9', target: '1', weight: 1 },
      { source: '8', target: '1', weight: 1 },
      { source: '11', target: '10', weight: 1 },
      { source: '11', target: '2', weight: 1 },
      { source: '11', target: '1', weight: 1 },
      { source: '10', target: '2', weight: 1 },
      { source: '10', target: '1', weight: 1 },
      { source: '12', target: '4', weight: 1 },
      { source: '12', target: '1', weight: 3 },
      { source: '13', target: '1', weight: 1 },
    ],
  };

  scriptStopped = false;
  script: SceneType[] = [
    {
      function: this.write,
      text: 'Hello!',
      delay: 1000,
    },
    {
      function: this.write,
      text: ' Headsoak is for taking notes. This is a note.',
      delay: 500,
    },
    {
      function: this.write,
      text: ' A really great, fantastic note.',
      // addTag: this.tagSentPos,
      delay: 0,
    },
    {
      function: this.write,
      text: ' ',
      // addTag: this.tagTopNote,
      delay: 1000,
    },
    {
      function: this.write,
      text: 'See those tags? Headsoak is smart and can tag notes automatically.',
      delay: 1500,
    },
    // {
    //   function: this.unwrite,
    //   text: '\n\nThis is ',
    //   removeTag: this.tagSentPos,
    // },
    // {
    //   function: this.write,
    //   text: 'actually a very sad note, because the beta is still private =(',
    //   addTag: this.tagSentNeg,
    //   delay: 1500,
    // },

    // {
    //   function: this.unwrite,
    //   text: '\n\n',
    //   removeTag: this.tagSentNeg,
    //   delay: 1000,
    // },
    // {
    //   function: this.write,
    //   text: 'Smart tags can give a note more context. Let\'s see...\n\n',
    // },
    // {
    //   function: this.write,
    //   text: 'Overheard at cafe, guy ',
    //   addTag: this.tagLocGaia,
    //   delay: 0
    // },
    // {
    //   function: this.write,
    //   text: 'trying to convince his friend we\'re in the future:',
    //   delay: 0
    // },
    // {
    //   function: this.write,
    //   text: ' "There are six people living',
    //   addTag: this.tagQuote,
    //   speed: 1.5,
    //   delay: 0
    // },
    // {
    //   function: this.write,
    //   text: ' in space right now! There are people nanowire tissue that bonds with human flesh and the human electrical system!"',
    //   speed: 1.5,
    // },

    {
      function: this.write,
      text: '\n\nOf course, you can manually tag notes',
      manualAddTag: 'futurism', // @TODO/hp Probably different tag
    },
    {
      function: this.write,
      text: ' and we\'ll learn from your tagging habits.',
      delay: 2000,
    },

    {
      function: this.write,
      text: '\n\nNow you try, or explore more below.',
    },

    // {
    //   function: this.write,
    //   text: '\n\nTags can do some of the work for you.',
    // },
    // {
    //   function: this.write,
    //   text: '\n\nShare notes with people and collaborate in real time.',
    //   manualAddTag: this.tagShare,
    //   delay: 1000
    // },
    // {
    //   function: this.write,
    //   text: '\n\nAutomate tasks.',
    //   manualAddTag: this.tagBlog,
    //   delay: 1000
    // },

    // {
    //   function: this.write,
    //   text: '\n\nThen, explore your data.',
    //   delay: 1000
    // },
    // {
    //   function: this.setUpTagExplore,
    // },
    // {
    //   function: this.write,
    //   text: '\n\nOur public beta is launching soon, sign up to get notified!',
    // },
  ];

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private progTagApi: ProgTagApiService,
    private progTagLibrary: ProgTagLibraryService
   ) {
    this.initTags();

    // Modify our  note to *always* do full updates (so we get prog tags)
    this.demoNote['_updated'] = this.demoNote.updated;
    this.demoNote.updated = function(updateModified, fullUpdate) {
      this['_updated'](updateModified, true);
    }
  }

  ngOnInit() {
    jQuery(window).one('mousedown.hsHp touchstart.hsHp', () => {
      this.stealFocus = false;
    });
  }

  ngAfterViewInit() {
    // When the graph is first set up it bounces around a bit which looks dynamic and invites user to play. It's just below the fold so we can wait until first scroll to trigger.
    jQuery('modal').first().one('scroll.hsHp', () => {
      setTimeout(() => {
        this.showVis = true;
      }, 200);
    });

    this.demoNoteBody = this.demoNoteRef.el.nativeElement.querySelector('.body-input');
    this.demoNoteAddTagInput = this.demoNoteRef.el.nativeElement.querySelector('.new-tag-input');

    jQuery(this.demoNoteBody).one('click.hsHp', () => {
      this.scriptStopped = true;
      utils.placeCaretAtEnd(this.demoNoteBody);
    });

    setTimeout(this.play.bind(this), 0);
  }

  ngOnDestroy() {
    jQuery(window).off('.hsHp');
    jQuery('modal').off('.hsHp');
    jQuery(this.demoNoteBody).off('.hsHp');
  }

  initTags() {
    this.libraryTags.forEach((libraryTagId) => {
      const tag = this.fakeDataService.tags.createTag(
        _.find(this.progTagLibrary.librarySourceData, { id: libraryTagId })
      );

      tag.setUpAndValidateProgTag();

      if (tag.id === 'lib--auto') {
        this.hackAutoTag(tag);
      }
    });

    this.tagData.forEach((data) => {
      if (data['parentTagId']) {
        this.fakeDataService.tags.createNewChildTag(data['childTagName'], this.fakeDataService.tags.tags[data['parentTagId']]);
      }
      else {
        this.fakeDataService.tags.createTag(data);
      }
    });

    this.staticNote1Tags = [
      this.fakeDataService.tags.getTagByName('sentiment: positive'),
      this.fakeDataService.tags.getTagByName('auto: sentiment'),
      this.fakeDataService.tags.getTagByName('auto: tag'),
      this.fakeDataService.tags.getTagByName('auto: insights'),
    ];
    this.staticNote2Tags = [
      this.fakeDataService.tags.tags['sd'],
      this.fakeDataService.tags.tags['rt'],
      this.fakeDataService.tags.getTagByName('auto: tag'),
      this.fakeDataService.tags.getTagByName('auto: note'),
      this.fakeDataService.tags.getTagByName('auto: learning'),
    ];
  }

  /** @HACK Nasty shit to make sure auto tag finds "notes" and also doesn't find 'tag notes' =) */
  hackAutoTag(tag: Tag) {
    tag['_handleClassifierResult'] = tag.handleClassifierResult;
    tag.handleClassifierResult = function(note, result) {
      if (note.body.indexOf('notes') !== -1) {
        result = result || [];
        result['push']({ childTag: 'notes', score: '100%' });
      }
      return this['_handleClassifierResult'](note, result);
    }

    tag['_handleClassifierResultDatum'] = tag.handleClassifierResultDatum;
    tag.handleClassifierResultDatum = function(note, noteDatum, tagsToRemove) {
      if (noteDatum && noteDatum['childTag'] === 'tag notes') {
        return;
      }
      return this['_handleClassifierResultDatum'](note, noteDatum, tagsToRemove);
    }
  }

  play(i = 0) {
    if (this.scriptStopped) {
      return;
    }

    const scene = this.script[i];

    if (! scene) {
      // We're done!
      return;
    }

    if (scene.text) {
      // e.g. we're running this.write or this.unwrite, so supply text as first arg
      scene.function = _.partial(scene.function, scene.text);
    }

    scene.function.bind(this)(() => {
      // if (scene.addTag) {
      //   this.addTag(scene.addTag);
      // }
      // if (scene.removeTag) {
      //   this.removeTag(scene.removeTag);
      // }

      const nextScene = () => {
        setTimeout(() => {
          this.play(i + 1);
        }, typeof scene.delay === 'undefined' ? 500 : scene.delay);
      };

      if (scene.manualAddTag) {
        this.manualAddTag(scene.manualAddTag, nextScene);
      }
      else {
        nextScene();
      }
    }, 0, scene.speed || 1);
  }

  manualAddTag(tagName: string, cb?: Function) {
    this.demoNoteAddTagInput.value = '';
    this.demoNoteRef.addingTag = true;

    setTimeout(() => {
      this.write(tagName, () => {
        setTimeout(() => {
          this.demoNoteRef.completeAddTag(tagName, true);
          cb();
        }, 500);
      }, 0, 0.33, this.demoNoteAddTagInput)
    }, 500);
  }

  write(str: string, cb?: Function, i = 0, speed = 1, el?: HTMLInputElement) {
    if (this.scriptStopped) {
      return;
    }

    if (! el) {
      el = this.demoNoteBody;
    }

    if (typeof el.value !== 'undefined') {
      el.value += str.substr(i, 1);
    }
    else {
      el.innerHTML += str.substr(i, 1);
      if (this.stealFocus) {
        utils.placeCaretAtEnd(el);
      }
    }

    el.scrollTop = el.scrollHeight;

    if (i === str.length - 1) {
      if (cb) {
        if (el === this.demoNoteBody) {
          this.demoNote.body = el.innerHTML;
          this.demoNote.doFullUpdate();
          setTimeout(this.demoNoteRef.checkTagOverflow.bind(this.demoNoteRef), 100);
        }
        cb();
      }

      return;
    }

    if (this.stealFocus) {
      el.focus();
    }

    let delay = Math.floor(Math.random() * (50)) + 25;

    if (str[i - 1] === ',' || str[i - 1] === ':') {
      delay += 150;
    }
    else if (str[i - 1] === '.' || str[i - 1] === '!' || str[i - 1] === '?') {
      delay += 350;
    }

    setTimeout(() => {
      this.write(str, cb, i + 1, speed, el);
    }, delay / speed);
  }

  /** Deletes contents in demoNoteBody until content ends with given string. */
  unwrite(str: string, cb?: Function) {
    if (this.scriptStopped) {
      return;
    }

    const currentString = this.demoNoteBody.innerHTML;

    if (currentString.indexOf(str) === -1) {
      throw Error('Current string doesn\'t contain with given string!');
    }

    if (currentString.endsWith(str)) { // @TODO/now TypeScript doesn't polyfill this
      if (cb) {
        this.demoNote.body = this.demoNoteBody.innerHTML;
        this.demoNote.doFullUpdate();
        setTimeout(this.demoNoteRef.checkTagOverflow.bind(this.demoNoteRef), 100);
        cb();
      }

      return;
    }

    if (this.stealFocus) {
      this.demoNoteBody.focus();
    }

    this.demoNoteBody.innerHTML = currentString.substr(0, currentString.length - 1);

    setTimeout(() => {
      this.unwrite(str, cb);
    }, 25);
  }

  // addTag(tagName: string) {
  //   const tag = this.fakeDataService.tags.getTagByName(tagName);

  //   this.demoNote.addTag(tag, true, true);

  //   // triggers chiclet style then let it fade
  //   // @TODO/now
  //   setTimeout(function() {
  //     tag['highlight'] = true;
  //   }, 10);
  //   setTimeout(function() {
  //     tag['highlight'] = false;
  //   }, 500);
  // }

  // removeTag(tag: Tag) {
  //   tag['beingRemoved'] = true;
  //   tag['highlight'] = true;
  //   setTimeout(function() {
  //     tag['highlight'] = false;
  //   }, 500);
  //   setTimeout(() => {
  //     this.tags = _.without(this.tags, tag);
  //   }, 1000);
  // }

  // setUpTagExplore() {
  //   this.tagExploreStage = true;
  // }


}
