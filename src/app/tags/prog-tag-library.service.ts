import {Injectable} from '@angular/core';

import {TagsService} from './tags.service';
import {Tag, ClassifierResult, ClassifierReturnType} from './tag.model';
import {ProgTagApiService} from './prog-tag-api.service';
import {SizeMonitorService} from '../utils/size-monitor.service';
import {Note} from '../notes/note.model';

import {Logger} from '../utils/logger';

import * as _ from 'lodash';

@Injectable()
export class ProgTagLibraryService {
  private tagsService: TagsService;

  /** @NOTE Changing IDs in source code here could really mess things up for users who are using them. */
  librarySourceData = [
    {
      id: 'lib--sentiment',
      fromLib: true,
      readOnly: true,
      name: 'sentiment',
      description: 'Tag notes that show a markedly positive or negative sentiment. Hover over the tag on a note to see the calculated strength of that note\'s sentiment. Only works on English text.',
      prog: true,
      // @NOTE Can use this function definition to write the library tag with the benefits of type checking and general JS linting, and then just comment out and use backticks (and comment/update the last line of func as well, AND make sure to double escape as necessary)
      // progFunc: function(api, _): (note: Note) => ClassifierReturnType {
      progFuncString: `// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm's \`sentiment\` module) have been bundled with the app.
var sentiment = api.lib.sentiment;

return function(note) {
  var result = sentiment(note.body);
  var score = result && result.comparative ? result.comparative : 0;

  var value;
  if (score >= 0.1) {
    value = 'positive';
  }
  else if (score <= -0.1) {
    value = 'negative';
  }
  else {
    return false;
  }

  return {
    childTag: value,
    score: Math.round(score * 1000) / 10 + '%',
  }
};` // }
    },
    {
      id: 'lib--topic',
      fromLib: true,
      readOnly: true,
      name: 'topic',
      description: 'Automatically identify topics relevant to each note and tag as such. Only works on English text.',
      prog: true,
      // progFunc: function(api: ProgTagApiService, _): (note: Note) => ClassifierReturnType {
      progFuncString:`// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (e.g. npm's \`retext-keywords\` module) have been bundled with the app.
var retext = api.lib.retext;
var retextKeywords = api.lib.retextKeywords;
var nlcstToString = api.lib.nlcstToString;
var _this = this;

var processor = retext().use(retextKeywords);

// retext-keywords does use a stopword list, but for our purposes we need a stricter list:
var defaultBlacklist = {
  'blah': 1,
  'both': 1,
  'first': 1,
  'http': 1,
  'https': 1,
  'kind': 1,
  'lot': 1,
  'lots': 1,
  'option': 1,
  'number': 1,
  'ones': 1,
  'order': 1,
  'person': 1,
  'room': 1,
  'stuff': 1,
  'thing': 1,
  'things': 1,
  'times': 1,
  'use': 1,
  'vs': 1,
  'way': 1,

  'one': 1,
  'two': 1,
  'three': 1,
  'four': 1,
  'five': 1,
  'six': 1,
  'seven': 1,
  'eight': 1,
  'nine': 1,
  'ten': 1,
};

// And the user can add their own:
if (! this.data.blacklist) {
  this.data.blacklist = {};
}

function confirmBlacklisting(childTag, event, tagDetailsComponent) {
  if (event.shiftKey) {
    blacklistChildTag(childTag, tagDetailsComponent);
    return;
  }

  api.modal.confirm(
    '<p>Are you sure you want to blacklist the topic <span class="static-tag">' + _.escape(childTag.childTagName) + '</span>? It won\\'t be suggested again.</p><p>You can view and edit the list of blacklisted tags from the <span class="static-tag">' + _.escape(_this.name) + '</span> Explore page.</p><p>Hold the shift key to skip this dialog in the future.</p>',
    function(confirmed) {
      if (confirmed) {
        blacklistChildTag(childTag, tagDetailsComponent);
      }
    },
    true,
    'Blacklist'
  );
}

function blacklistChildTag(childTag, tagDetailsComponent) {
  _this.data.blacklist[childTag.childTagName] = true;
  childTag.delete(true);

  if (tagDetailsComponent && tagDetailsComponent.setUpChildTags) {
    tagDetailsComponent.setUpChildTags();
  }
}

this.customActions.childTags = [{
  icon: 'minus-circle',
  text: 'Blacklist this topic',
  func: confirmBlacklisting
}];


// The part-of-speech tagger that the retext library uses doesn't handle contractions, so they're "unknown" words and can turn up as keywords. Here's a quick contraction replacer.
// (These can all be lower case since we convert note body to lower case before processing anyway)
var contractions = {
  'n[’\\']t\\\\b': ' not',
  '[’\\']re\\\\b': ' are',
  '[’\\']m\\\\b':  ' m',
  '[’\\']ll\\\\b': ' will',
  '[’\\']ve\\\\b': ' have',
  // This doesn't handle all "'d" or "'s" because expansions for those are ambiguous without something more sophisticated, but we can catch some common ones:
  '\\\\bit[’\\']s\\\\b': 'it is',
  '\\\\bwhat[’\\']s\\\\b': 'what is',
  '\\\\bthat[’\\']s\\\\b': 'that is',
  '\\\\bthatthere[’\\']s\\\\b': 'there is',
  '\\\\bshe[’\\']s\\\\b': 'she is',
  '\\\\bhe[’\\']s\\\\b': 'he is',
  '\\\\bi[’\\']d\\\\b': 'i would',
  '\\\\byou[’\\']d\\\\b': 'you would',
  '\\\\bshe[’\\']d\\\\b': 'she would',
  '\\\\bhe[’\\']d\\\\b': 'he would',
  '\\\\blet[’\\']s\\\\b': 'let us',
};
var contractionRegExp = new RegExp(Object.keys(contractions).join('|'), 'g');
function contractionReplacer(contraction) {
  return contractions[contraction];
}
function expandContractions(input) {
  return input.replace(contractionRegExp, contractionReplacer);
}

var punctuationFixRegExp = new RegExp('\\\\d([-’\\'])\\\\d', 'g');

// And, finally, the actual classifier we run on each note
return function(note) {
  var resolve, reject;
  var result = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });

  var childTags = [];

  // Convert to lower case so that retext-keywords doesn't think differently-cased uses of the same term are different
  // @TODO/prog Filter out URLs - pieces of them get picked up sometimes
  var text = expandContractions(note.body.toLowerCase());

  processor.process(text, function(err, doc) {
    doc.data.keyphrases.forEach(function (phrase, i) {
      if (childTags.length >= 5) {
        return;
      }

      var childTagName = phrase.matches[0].nodes.map(nlcstToString)
        .join('')
        .replace(punctuationFixRegExp, '$1'); // @HACK: nlcstToString seems to return these PunctuationNodes with numbers on either side, e.g. "feature2-2bloat";

      if (childTagName.length < 3) {
        return;
      }

      if (childTagName.indexOf('\\n') !== -1) {
        // Tags with line breaks in them seem universally to be nonsensical tags
        return;
      }

      if (defaultBlacklist[childTagName] || _this.data.blacklist[childTagName]) {
        return;
      }

      // @TODO/prog See if we should exclude low-scoring matches on short notes (on long notes most matches are low-scoring)

      childTags.push({
        childTag: childTagName,
        score: Math.round(phrase.score * 1000) / 10 + '%'
      });
    });

    if (childTags.length) {
      resolve(childTags);
    }
    else {
      resolve(false);
    }
  });

  return result;
}`
// }}
    },
    {
      id: 'lib--nsfw',
      fromLib: true,
      readOnly: true,
      name: 'nsfw',
      description: 'Automatically tags NSFW (not safe for work) notes and makes them private. (To err on the safe side, if this smart tag previously detected NSFW content in a note and then later no longer does, the note will remain private - though this tag will be removed.) Only works on English text.',
      prog: true,
      // progFunc: function(api: ProgTagApiService, _): (note: Note) => ClassifierReturnType {
      progFuncString:`// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm's \`retext-profanities\` module) have been bundled with the app.
var retext = api.lib.retext;
var retextProfanities = api.lib.retextProfanities;

var processor = retext().use(retextProfanities);

return function(note) {
  var resolve, reject;
  var result = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });

  processor.process(note.body, function(err, doc) {
    if (err) {
      throw err;
    }

    if (doc && _.size(doc.messages)) {
      var actualProfanities = _.filter(doc.messages, { profanitySeverity: 2 });
      if (_.size(actualProfanities)) {
        console.info('Marking note', note.id, 'nsfw because of words:', _.map(actualProfanities, 'ruleId'));
        note.makePrivate();

        resolve(true);
        return;
      }
    }

    resolve(false);
  });

  return result;
}`//}
    },
    {
      id: 'lib--untagged',
      fromLib: true,
      readOnly: true,
      name: 'untagged',
      description: 'Tag all notes which have no tags',
      prog: true,
      progFuncString: `return function(note) {
  if (note.tags.length === 0) {
    return true;
  }
  else if (note.tags.length === 1 && note.tags[0] === this.id) {
    // Note has only one tag and it's this one! note that without this check, this smart tag would produce an infinite loop. First an untagged note would be assigned this tag, and then, since the note was updated, it would be checked against smart tags again. This tag would then remove itself, triggering another update where it would be added back, etc.
    return true;
  }
  else {
    return false;
  }
}`,
    },
    {
      id: 'lib--has-quote',
      fromLib: true,
      readOnly: true,
      name: 'has quote',
      description: 'Tag all notes which contain quotes. This is calculated by looking to see if at least one line in the note follows the Markdown syntax for blockquotes: starting a line with "> ".',
      prog: true,
      // old version which looks for 50% of lines being a quote:
      // progFuncString: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\\n\');\nvar numQuoteLines = 0;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\') {\n    numQuoteLines++;\n  }\n});\n\nif (numQuoteLines / lines.length >= 0.5) {\n  return true;\n} else {\n  return false;\n}',
      progFuncString: `return function(note) {
  if (! note.body) {
    return false;
  }

  var lines = note.body.split('\\n');
  var foundQuote = false;

  _.each(lines, function(line) {
    if (line[0] === '>' && line[1] === ' ') {
      foundQuote = true;
      return false;
    }
  });

  return foundQuote;
}`,
    },
    {
      id: 'lib--nutmeg',
      fromLib: true,
      readOnly: true,
      name: 'mentions headsoak', // @TODO/prog Mention or show that this is a "tutorial" tag or something. BETTER: Make it customizable for search string
      description: 'Tag all notes which contain the text "headsoak"',
      prog: true,
      progFuncString: `return function(note) {
  if (note.body.toLowerCase().indexOf("headsoak") !== -1) {
    return true;
  }
  else {
    return false;
  }
}`,
    },
    // {
    //   name: 'List',
    //   description: 'Applies tag to notes where the majority of lines appear to be items in a list',
    //   progFuncString: ''
    // },
    // '// programmatically create a general \"nutmeg\" parent tag.\n\n// let\'s also use some lo-dash/underscore\n\nvar noteTagNames = _.map(note.tags, function(tagId) {\n  return getTagNameById(tagId);\n});\n\nvar nutmegTags = ["nutmeg bugs", "nutmeg features", "nutmeg faq", "nutmeg shortcodes", "nutmeg inspiration"];\n\nvar intersection = _.intersection(nutmegTags, noteTagNames);\n\nif (intersection.length) {\n  return true;\n}\nelse {\n  return false;\n}',
  ];

  library: Tag[];

  private _logger: Logger = new Logger(this.constructor.name);


  constructor(
    private sizeMonitor: SizeMonitorService,
  ) {}

  init(tagsService: TagsService) {
    this.tagsService = tagsService;

    this.library = _.map(this.librarySourceData, (tagData) => {
      return this.initializeLibraryTag(tagData);
    });
  }

  initializeLibraryTag(tagData): Tag {
    const localTag = this.tagsService.tags[tagData.id];

    if (localTag) {
      // This tag is being used by the user, so let's pick that up in order to get `docs` list etc.

      // While we're at it we may need to update the tag - but wait til we're initialized so that a) any toasters will be visible instead of blocked by full page loader, and b) re-running prog tag won't delay loading
      // @TODO/optimization @TODO/soon @TODO/prog Topic tag is too heavy to run on mobile, maybe others too. This could be more sophisticated though, maybe something in tagData to indicate that it's too computationally heavy, or we should check number of user's notes... etc.
      if (! this.sizeMonitor.isMobile) {
        this.tagsService.dataService.initialized$.filter(initialized => !! initialized).first().subscribe(() => {
          // Seems like we  need to wait even longer... otherwise mysteriously can get loader forever while this runs
          setTimeout(() => {
            this.maybeUpdateLocalTag(localTag, tagData);
          }, 7500);
        });
      }

      return localTag;
    }
    else {
      // A sort of "detached" version of the tag, that will be added to user's data if they choose to enable it
      return new Tag(tagData, this.tagsService.dataService);
    }
  }

  maybeUpdateLocalTag(localTag: Tag, latestTagData) {
    let funcUpdated, nameUpdated, oldName;

    if (localTag.progFuncString !== latestTagData.progFuncString) {
      funcUpdated = true;
    }

    if (localTag.name !== latestTagData.name) {
      oldName = localTag.name;
      nameUpdated = true;

      localTag.name = latestTagData.name;
      localTag.updated(false);
    }

    if (localTag.description !== latestTagData.description) {
      localTag.description = latestTagData.description;
      localTag.updated(false);
    }

    if (! funcUpdated && ! nameUpdated) {
      return;
    }

    let message: string;
    if (funcUpdated && nameUpdated) {
      message = '<p>Re-running tag on all your notes now. Also, it has been renamed to <span class="static-tag">' + latestTagData.name + '</span>.</p>';
    }
    else if (funcUpdated) {
      message = '<p>The code for this Smart Tag Library tag has been updated - re-running it on all your notes now.</p>';
    }
    else if (nameUpdated) {
      message = '<p>This Smart Tag Library tag has been renamed to <span class="static-tag">' + latestTagData.name + '</span>.</p>';
    }

    message += '<p>Click for tag details.</p>';

    this.tagsService.dataService.toaster.info(
      message,
      'Smart tag <span class="static-tag">' + (oldName || localTag.name) + '</span> updated',
      {
        timeOut: 10000,
        onclick: () => {
          localTag.goTo();
        }
      }
    );

    // Wait til down here to do this so that toaster pops up first
    if (funcUpdated) {
      // Function has been updated from official sources since user last used it, so let's update.
      this._logger.info('Enabled smart tag library tag "' + localTag.id + '" source has been updated - re-running it now.');
      this.tagsService.dataService.status = 'unsynced'; // We know we're going to have to update the tag, but if `runProgOnAllNotes` takes a long time (and is synchronous) we want the sync animation to change immediately before that starts.
      localTag.updateProgFuncString(latestTagData.progFuncString);
      localTag.runProgOnAllNotes();
      localTag.updated(false);
    }
  }

  toggleTagById(tagId: string) {
    const tag = _.find(this.library, { id: tagId });

    if (! tag) {
      throw Error('Smart tag' + tagId + 'not found in the library');
    }

    this.toggleTag(tag);
  }

  /** Enables/disables a tag for this user. */
  toggleTag(tag: Tag) {
    if (! this.tagsService.tags[tag.id]) {
      tag.reset();
      this.tagsService.addTag(tag);
    }
    else {
      // Doesn't actually destroy instance, but it removes from all notes, from tag list, and from user data store:
      tag.delete(true);
    }
  }
}
