import {Component, ViewChild, ElementRef, HostBinding} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Logger} from '../utils/logger';

import {LoginComponent} from '../account/';
import {Tag, SubTag, TagComponent} from '../tags/';
import {ForceGraphComponent, ForceGraph} from '../utils/force-graph.component';

const jQuery = require('jquery');

type SceneType = {
  function: Function, // gets bound to HomepageComponent
  text?: string,
  addTag?: Tag,
  removeTag?: Tag,
  manualAddTag?: Tag,
  delay?: number, // delay before next scene in script
  speed?: number, // divisor of delays in writing
};

@Component({
  selector: 'homepage',
  pipes: [ ],
  providers: [ ],
  directives: [
    LoginComponent,
    TagComponent,
    ForceGraphComponent,
  ],
  templateUrl: './homepage.component.html'
})
export class HomepageComponent {
  tags: Tag[] = [];

  stealFocus = true;

  addingTag = false;

  @HostBinding('class.is--tag-explore-stage') tagExploreStage = false;

  @ViewChild('noteBody') noteBody: ElementRef;
  // @ViewChild('noteTags') noteTags: ElementRef;
  @ViewChild('noteAddTagInput') noteAddTagInput: ElementRef;

  tagSent = new Tag({ id: 'sent', name: 'sentiment', prog: true }, null);
  tagSentPos = new SubTag('positive', this.tagSent);
  tagSentNeg = new SubTag('negative', this.tagSent);

  tagLoc = new Tag({ id: 'loc', name: 'location', prog: true }, null);
  tagLocGaia = new SubTag('Gaia Cafe', this.tagLoc);

  tagQuote = new Tag({ id: 'quote', name: 'quote', prog: true }, null);
  tagFut = new Tag({ id: 'fut', name: 'futurism' }, null);
  tagShare = new Tag({ id: 'share', name: '@napoleon', share: true }, null);
  tagBlog = new Tag({ id: 'blog', name: 'post to blog', prog: true }, null);

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

  script: SceneType[] = [
    {
      function: this.write,
      text: 'Hello!',
      delay: 1000,
    },
    {
      function: this.write,
      text: ' Headsoak is for taking notes. This is a note.\n\n',
      delay: 1000,
    },
    {
      function: this.write,
      text: 'This is a really fantastic, great, happy note.',
      addTag: this.tagSentPos,
      delay: 1500,
    },
    {
      function: this.write,
      text: ' See that tag? Headsoak is smart and can tag notes automatically.',
      delay: 1500,
    },
    {
      function: this.unwrite,
      text: '\n\nThis is ',
      removeTag: this.tagSentPos,
    },
    {
      function: this.write,
      text: 'actually a very sad note, because the beta is still private =(',
      addTag: this.tagSentNeg,
      delay: 1500,
    },

    {
      function: this.unwrite,
      text: '\n\n',
      removeTag: this.tagSentNeg,
      delay: 1000,
    },
    {
      function: this.write,
      text: 'Smart tags can give a note more context. Let\'s see...\n\n',
    },
    {
      function: this.write,
      text: 'Overheard at cafe, guy ',
      addTag: this.tagLocGaia,
      delay: 0
    },
    {
      function: this.write,
      text: 'trying to convince his friend we\'re in the future:',
      delay: 0
    },
    {
      function: this.write,
      text: ' "There are six people living',
      addTag: this.tagQuote,
      speed: 1.5,
      delay: 0
    },
    {
      function: this.write,
      text: ' in space right now! There are people nanowire tissue that bonds with human flesh and the human electrical system!"',
      speed: 1.5,
    },

    {
      function: this.write,
      text: '\n\nOf course, you can manually tag notes',
      manualAddTag: this.tagFut,
    },
    {
      function: this.write,
      text: ' and we\'ll learn from your tagging habits.',
      delay: 2000,
    },

    {
      function: this.write,
      text: '\n\nTags can do some of the work for you.',
    },
    {
      function: this.write,
      text: '\n\nShare notes with people and collaborate in real time.',
      manualAddTag: this.tagShare,
      delay: 1000
    },
    {
      function: this.write,
      text: '\n\nAutomate tasks.',
      manualAddTag: this.tagBlog,
      delay: 1000
    },

    {
      function: this.write,
      text: '\n\nThen, explore your data.',
      delay: 1000
    },
    {
      function: this.setUpTagExplore,
    },
    // {
    //   function: this.write,
    //   text: '\n\nOur public beta is launching soon, sign up to get notified!',
    // },
  ];

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService
   ) {}

  ngOnInit() {
    jQuery(window).one('mousedown touchstart', () => {
      this.stealFocus = false;
    });
  }

  ngAfterViewInit() {
    this.play();
  }

  play(i = 0) {
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
      if (scene.addTag) {
        this.addTag(scene.addTag);
      }
      if (scene.removeTag) {
        this.removeTag(scene.removeTag);
      }

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

  manualAddTag(tag: Tag, cb?: Function) {
    this.noteAddTagInput.nativeElement.value = '';
    this.addingTag = true;

    setTimeout(() => {
      this.write(tag.name, () => {
        setTimeout(() => {
          this.addingTag = false;
          this.addTag(tag);
          cb();
        }, 500);
      }, 0, 0.25, this.noteAddTagInput.nativeElement)
    }, 500);
  }

  write(str: string, cb?: Function, i = 0, speed = 1, el?: HTMLInputElement) {
    if (! el) {
      el = this.noteBody.nativeElement;
    }

    el.value += str.substr(i, 1);
    el.scrollTop = el.scrollHeight;

    if (i === str.length - 1) {
      if (cb) {
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

  /** Deletes contents in noteBody until content ends with given string. */
  unwrite(str: string, cb?: Function) {
    const currentString = this.noteBody.nativeElement.value;

    if (currentString.indexOf(str) === -1) {
      throw Error('Current string doesn\'t contain with given string!');
    }

    if (currentString.endsWith(str)) { // @TODO/now TypeScript doesn't polyfill this
      if (cb) {
        cb();
      }

      return;
    }

    if (this.stealFocus) {
      this.noteBody.nativeElement.focus();
    }

    this.noteBody.nativeElement.value = currentString.substr(0, currentString.length - 1);

    setTimeout(() => {
      this.unwrite(str, cb);
    }, 25);
  }

  addTag(tag: Tag) {
    this.tags = _.concat([tag], this.tags);

    // triggers chiclet style then let it fade
    setTimeout(function() {
      tag['highlight'] = true;
    }, 10);
    setTimeout(function() {
      tag['highlight'] = false;
    }, 500);
  }

  removeTag(tag: Tag) {
    tag['beingRemoved'] = true;
    tag['highlight'] = true;
    setTimeout(function() {
      tag['highlight'] = false;
    }, 500);
    setTimeout(() => {
      this.tags = _.without(this.tags, tag);
    }, 1000);
  }

  setUpTagExplore() {
    this.tagExploreStage = true;
  }


}
