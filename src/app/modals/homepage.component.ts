import {Component, ViewChild, ElementRef/*, HostBinding*/} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Logger} from '../utils/logger';

// import {LoginComponent} from '../account/';
import {Tag, SubTag, TagComponent} from '../tags/';

type SceneType = {
  function: string,
  text: string,
  addTag?: Tag,
  removeTag?: Tag,
  delay?: number, // delay before next scene in script
  speed?: number, // divisor of delays in writing
};

@Component({
  selector: 'homepage',
  pipes: [ ],
  providers: [ ],
  directives: [
    // LoginComponent,
    TagComponent,
  ],
  templateUrl: './homepage.component.html'
})
export class HomepageComponent {
  tags: Tag[] = [];

  @ViewChild('noteBody') noteBody: ElementRef;
  @ViewChild('noteTags') noteTags: ElementRef;

  tagSent = new Tag ({
    id: 'sent',
    name: 'sentiment',
    prog: true,
  }, null);
  tagSentPos = new SubTag('positive', this.tagSent);
  tagSentNeg = new SubTag('negative', this.tagSent);

  tagLoc = new Tag ({
    id: 'loc',
    name: 'location',
    prog: true,
  }, null);
  tagLocGaia = new SubTag('Gaia Cafe', this.tagLoc);

  tagQuote = new Tag ({
    id: 'quote',
    name: 'quote',
    prog: true,
  }, null);

  tagFut = new Tag ({
    id: 'fut',
    name: 'futurism',
  }, null);

  tagShare = new Tag ({
    id: 'share',
    name: '@napoleon',
    share: true,
  }, null);

  tagBlog = new Tag ({
    id: 'blog',
    name: 'post to blog',
    prog: true,
  }, null);

  script: SceneType[] = [
    {
      function: 'write',
      text: 'Hello! Headsoak is for taking notes. This is a note.\n\n',
      delay: 1000,
    },
    {
      function: 'write',
      text: 'This is a really fantastic, great, happy note.',
      addTag: this.tagSentPos,
      delay: 1000,
    },
    {
      function: 'write',
      text: ' See that tag? Headsoak is smart and can tag your notes automatically.',
      delay: 2000,
    },
    {
      function: 'unwrite',
      text: '\n\nThis is ',
      removeTag: this.tagSentPos,
    },
    {
      function: 'write',
      text: 'actually a very sad note, because the beta is still private =(',
      addTag: this.tagSentNeg,
      delay: 1000,
    },

    {
      function: 'unwrite',
      text: '\n\n',
      removeTag: this.tagSentNeg,
    },
    {
      function: 'write',
      text: 'Smart tags can give a note more context.\n\n',
    },
    {
      function: 'write',
      text: 'Overheard at cafe, guy ',
      addTag: this.tagLocGaia,
      delay: 0
    },
    {
      function: 'write',
      text: 'trying to convince his friend we\'re in the future:',
      delay: 0
    },
    {
      function: 'write',
      text: ' "There are six people living',
      addTag: this.tagQuote,
      speed: 2,
      delay: 0
    },
    {
      function: 'write',
      text: ' in space right now. There are people printing prototypes of human organs, and people printing nanowire tissue that will bond with human flesh and the human electrical system."',
      speed: 2,
    },

    {
      function: 'write',
      text: '\n\nOf course, you can manually tag notes',
      addTag: this.tagFut,
    },
    {
      function: 'write',
      text: ' and we\'ll learn from your tagging habits.',
      delay: 2000,
    },

    {
      function: 'write',
      text: '\n\nTags can do some of the work for you.',
    },
    {
      function: 'write',
      text: ' Share notes with people and collaborate.',
      addTag: this.tagShare,
      delay: 1000
    },
    {
      function: 'write',
      text: ' Automate custom integrations.',
      addTag: this.tagBlog,
      delay: 1000
    },

    {
      function: 'write',
      text: '\n\nThen, explore.',
    },
  ];

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService
   ) {}

  ngAfterViewInit() {
    this.play();
  }

  play(i = 0) {
    const scene = this.script[i];

    if (! scene) {
      return;
    }

    this[scene.function](scene.text, () => {
      if (scene.addTag) {
        this.tags = _.concat([scene.addTag], this.tags);
      }
      if (scene.removeTag) {
        this.tags = _.without(this.tags, scene.removeTag);
      }

      setTimeout(() => {
        this.play(i + 1);
      }, typeof scene.delay === 'undefined' ? 500 : scene.delay);
    }, 0, scene.speed || 1);
  }

  write(str: string, cb?: Function, i = 0, speed = 1) {
    this.noteBody.nativeElement.value += str.substr(i, 1);
    this.noteBody.nativeElement.scrollTop = this.noteBody.nativeElement.scrollHeight;

    if (i === str.length - 1) {
      if (cb) {
        cb();
      }

      return;
    }

    // @TODO/now Stop doing this if user focuses elsewhere
    this.noteBody.nativeElement.focus();

    let delay = Math.floor(Math.random() * (50)) + 50;

    if (str[i - 1] === ',' || str[i - 1] === ':') {
      delay += 150;
    }
    else if (str[i - 1] === '.' || str[i - 1] === '!' || str[i - 1] === '?') {
      delay += 350;
    }

    setTimeout(() => {
      this.write(str, cb, i + 1, speed);
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

    // @TODO/now Stop doing this if user focuses elsewhere
    this.noteBody.nativeElement.focus();

    this.noteBody.nativeElement.value = currentString.substr(0, currentString.length - 1);

    setTimeout(() => {
      this.unwrite(str, cb);
    }, 25);
  }


}
