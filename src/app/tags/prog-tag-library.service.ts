import {Injectable} from '@angular/core';

import {TagsService} from './tags.service';
import {Tag, ProgTagDef} from './tag.model';
import {ProgTagApiService} from './prog-tag-api.service';
import {SizeMonitorService} from '../utils/size-monitor.service';
import {Note} from '../notes/note.model';

import {Logger} from '../utils/logger';

import * as _ from 'lodash';

@Injectable()
export class ProgTagLibraryService {
  /** @NOTE Changing IDs in source code here could really mess things up for users who are using them. */
  librarySourceData = [
    {
      id: 'lib--auto',
      fromLib: true,
      name: 'auto',
      description: 'Automatically tags notes based on their content. Only works on English text.',
      prog: true,
      // progFunc: function(api: ProgTagApiService, _): ProgTagDef {
      progFuncString: `// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (e.g. npm's \`nlcstToString\` module) have been bundled with the app.
var nlcstToString = api.lib.nlcstToString;
var keywords = api.lib.keywords;
var _this = this;

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

function confirmBlacklisting(childTag, event, noteId, tagDetailsComponent) {
  if (event.shiftKey) {
    blacklistChildTag(childTag, tagDetailsComponent);
    return;
  }

  api.modal.confirm(
    '<p>Are you sure you want to blacklist the auto tag <span class="static-tag">' + _.escape(childTag.childTagName) + '</span>? It won\\'t be suggested again.</p><p>You can view and edit the list of blacklisted tags from the <span class="static-tag">' + _.escape(_this.name) + '</span> Explore page.</p><p>Hold the shift key to skip this dialog in the future.</p>',
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
  var blacklist = _this.getData('blacklist', {});
  blacklist[childTag.childTagName] = true;
  _this.setData('blacklist', blacklist); // we have to call this otherwise the update won't be saved 
  childTag.delete(true);

  if (tagDetailsComponent && tagDetailsComponent.setUpChildTags) {
    tagDetailsComponent.setUpChildTags();
  }
}

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
function classifier(note) {
  var resolve, reject;
  var p = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });

  var childTags = [];

  // Convert to lower case so that retext-keywords doesn't think differently-cased uses of the same term are different
  // @TODO/prog Filter out URLs - pieces of them get picked up sometimes
  var text = expandContractions(note.body.toLowerCase());

  keywords(text).then(function(doc) {
    doc.data.keyphrases.forEach(function (phrase, i) {
      if (childTags.length >= 5) {
        return;
      }

      var childTagName = phrase.matches[0].nodes.map(nlcstToString)
        .join('')
        .replace(punctuationFixRegExp, '$1'); // @HACK: nlcstToString seems to return these PunctuationNodes with numbers on either side, e.g. "feature2-2bloat";

      if (childTagName.length < 3 || childTagName.split(' ').length > 3) {
        return;
      }

      if (childTagName.indexOf('\\n') !== -1) {
        // Tags with line breaks in them seem universally to be nonsensical tags
        return;
      }

      if (defaultBlacklist[childTagName] || _this.getData('blacklist', {})[childTagName]) {
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

  return p;
};

return {
  classifier: classifier,

  customEntries: {
    childTags: [
      {
        icon: 'minus-circle',
        text: 'Blacklist this tag',
        func: confirmBlacklisting
      }
      // @TODO/prog It wouldn't be hard to add a "Rename this tag" custom entry. Just pops up a prompt for new name, saves the value in tag data, and then substitutes it whenever it finds it in the future.
    ]
  }
};`
// };}
    },
    {
      id: 'lib--sentiment',
      fromLib: true,
      name: 'sentiment',
      description: 'Tag notes that show a markedly positive or negative sentiment. Hover over the tag on a note to see the calculated strength of that note\'s sentiment. Only works on English text.',
      prog: true,
      // @NOTE Can use this function definition to write the library tag with the benefits of type checking and general JS linting, and then just comment out and use backticks (and comment/update the last line of func as well, AND make sure to double escape as necessary)
      // progFunc: function(api: ProgTagApiService, _): ProgTagDef {
      progFuncString: `// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm's \`sentiment\` module) have been bundled with the app.
var sentiment = api.lib.sentiment;

return function(note) {
  var resolve, reject;
  var p = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });

  sentiment(note.body).then(function(result) {
    var score = result && result.comparative ? result.comparative : 0;

    var value;
    if (score >= 0.1) {
      value = 'positive';
    }
    else if (score <= -0.1) {
      value = 'negative';
    }
    else {
      resolve(false);
      return;
    }

    resolve({
      childTag: value,
      score: Math.round(score * 1000) / 10 + '%',
    });
  });

  return p;
};`
// };}
    },
    {
      id: 'lib--remember',
      fromLib: true,
      name: 'remember this',
      description: 'Employ spaced repetition learning to better remember notes. Whenever you add this tag to one of your notes, Headsoak will email you that note in a day, a week, a month, 4 months, and 18 months after tagging.',
      prog: true,
      // progFunc: function(api: ProgTagApiService, _): ProgTagDef { const _this: Tag = this;
      // @TODO/ece @TODO/prog There should be other links back to Headsoak here
      // @TODO/prog The emails should have links for "actually, send me this again [sooner]" and "actually don't send me this until [later]" (and should this comment go in the prog tag code?)
      progFuncString: `var _this = this;

var defaultSchedule = [
  { hours: 24, words: '1 day', next: '6 days' },
  { hours: 7*24, words: '1 week', next: '3 weeks' },
  { hours: 30*24, words: '1 month', next: '3 months' },
  { hours: 4*30.5*24, words: '4 months', next: 'about a year' },
  { hours: 18*30.5*24, words: '18 months' },
];

if (! this.getData('schedule')) {
  this.setData('schedule', defaultSchedule);
}

function queueEmail(note, sendAt, words, nextInterval) {
  var subject = 'Remember this? ';
  subject += '"' + _.truncate(note.body, { length: 100, separator: /,? +/ }) + '"';

  var body = '<p>Hello' + (api.user.displayName ? ' ' + api.user.displayName : '') + '!</p>';

  body += '<p>' + words + ' ago you added the <span style="color: #F26B57"><span style="opacity: 0.33; margin-right: 1px">#</span>remember this</span> tag to this note:</p>';

  body += '<p>\\xa0</p><blockquote>';

  body += '<% if (note.tagInstances.length) { %>';
    body += '<p style="color: #F26B57">'
    body += '<% note.tagInstances.forEach(function(tag) { %>';
      body += '<span style="opacity: 0.33; margin-right: 1px">#</span>';
      body += '<%= tag.name %>';
      // body += '<% if (tag.prog) { %>⚡<% } %>'
      body += ' \\xa0';
    body += '<% }); %>';
    body += '</p>';
  body += '<% } %>';

  body += '<%= note.body %>';

  body += '</blockquote><p>\\xa0</p>';

  if (nextInterval) {
    body += '<p>The next time you receive this note will be in ' + nextInterval + '.</p>';
  }
  else {
    body += '<p>This is your last email! Hopefully you remember it pretty well by now.</p>';
  }

  body += '<p>Thanks for using Headsoak! We always love hearing from you, so feel free to reply with any feedback.</p>';

  // This will send an email to the current user's email address at the specified time.
  return api.queueUserEmail(sendAt, {
    subject: subject,
    bodyTemplate: body,
    tagId: _this.id,
    noteId: note.id,
  });
}

// Note that this smart tag does not return a classifier function. This tag isn't automatically assigned to notes - the user assigns it manually. We do, however, implement this tag by attaching functions to specific hooks:

return {
  hooks: {
    // This gets run every time this tag is added to a note:
    added: function(note) {
      var schedule = _this.getData('schedule', defaultSchedule);
      var now = Date.now();
      var queuedEmails = [];

      for (var i = 0; i < schedule.length; ++i) {
        var sendAt = now + schedule[i].hours*60*60*1000;

        // We need to grab and store the queued email ID so that if the user later removes this tag, we can cancel the email
        var emailId = queueEmail(note, sendAt, schedule[i].words, schedule[i].next);

        queuedEmails.push({
          id: emailId,
          sendAt: sendAt,
        });
      }

      // We can then save this info in this tag's data store, keyed by this particular note's ID
      _this.setData(note.id, queuedEmails);
    },

    // This gets run every time this tag is removed from a note:
    removed: function(note) {
      var queuedEmails = _this.getData(note.id) || [];
      queuedEmails.forEach(function(queuedEmail) {
        api.cancelQueuedEmail(queuedEmail.id);
      });

      _this.removeData(note.id);
    },
  },

  // Display text in tag dropdown on notes to show users when the previous/next emails were/will be sent:
  customEntries: {
    noteTagDropdown: [{
      text: function(tag, noteId) {
        var queuedEmails = _this.getData(noteId);
        if (! queuedEmails) {
          return '';
        }

        var prevEmail, nextEmail;
        var now = Date.now();
        for (var i = 0; i < queuedEmails.length; ++i) {
          if (queuedEmails[i].sendAt <= now) {
            prevEmail = queuedEmails[i];
          }
          else if (! nextEmail) {
            nextEmail = queuedEmails[i];
            break;
          }
        }

        var text = '';

        if (prevEmail) {
          text += 'Last email: ' + api.formatDate(prevEmail.sendAt, 'mediumDate') + '\\n';
        }

        if (nextEmail) {
          text += 'Next email: ' + api.formatDate(nextEmail.sendAt, 'mediumDate')
        }
        else {
          text += 'No more emails coming! (Remove and add this tag again to restart the schedule.)';
        }

        return text;
      }
    }]
  }
};`
// };}
    },
    {
      id: 'lib--nsfw',
      fromLib: true,
      name: 'nsfw',
      description: 'Automatically tags NSFW (not safe for work) notes and makes them private. (To err on the safe side, if this smart tag previously detected NSFW content in a note and then later no longer does, the note will remain private - though this tag will be removed.) Only works on English text.',
      prog: true,
      // progFunc: function(api: ProgTagApiService, _): ProgTagDef {
      progFuncString: `// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm's \`retext-profanities\` module) have been bundled with the app.
var profanities = api.lib.profanities;

return function(note) {
  var resolve, reject;
  var p = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });

  profanities(note.body).then(function(doc) {
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

  return p;
};`
// };}
    },
    {
      id: 'lib--untagged',
      fromLib: true,
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

  private tagsService: TagsService;

  private _logger: Logger = new Logger('ProgTagLibraryService');


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
      // @TODO/optimization @TODO/soon @TODO/prog Auto tag is too heavy to run on mobile, maybe others too. This could be more sophisticated though, maybe something in tagData to indicate that it's too computationally heavy, or we should check number of user's notes... etc.
      // @TODO/polish @TODO/prog Looks like this doesn't get run if you log out and log in again - I guess this service remains initialized. Could actually mess up stuff with local tags. When DataService uninitializes it should probably destroy and recreate this service.
      if (! this.sizeMonitor.isMobile) {
        this.tagsService.dataService.initialized$.filter((initialized) => !! initialized).first().subscribe(() => {
          // Seems like we  need to wait even longer... otherwise mysteriously can get loader forever while this runs
          // @TODO/now @TODO/prog Since we don't run `setUpAndValidateProgTag` until after checking for update, that means some stuff isn't set up in the first 7.5s and is weird... do it earlier if possible
          setTimeout(() => {
            this.maybeUpdateLocalTag(localTag, tagData);
          }, 7500);
        });
      }
      else {
        // Normally called in `maybeUpdateLocalTag` so on mobile just call this straight up
        localTag.setUpAndValidateProgTag(true);
      }

      return localTag;
    }
    else {
      // A sort of "detached" version of the tag, that will be added to user's data if they choose to enable it
      return new Tag(tagData, this.tagsService.dataService);
    }
  }

  // @TODO/refactor @TODO/prog It might be cleaner to simply not save `progFuncString` and others to the data store, and just refetch them from the hard-coded library on app load. This has the benefit of not needlessly storing long `progFuncString` and transmitting it with every update. However, we'd need to keep track of a version number or something to make sure we alert user and re-run when things change.
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

    if (! funcUpdated) {
      // For existing prog tags, TagsService runs this, but it does *not* run this on library tags in case the function has updated. Otherwise we could get a spurious error when running old function before we update to new function. But it hasn't updated, so just run this now.
      localTag.setUpAndValidateProgTag(true);
    }

    if (! funcUpdated && ! nameUpdated) {
      return;
    }

    // @TODO/now @TODO/prog Message shouldn't talk about re-running unless it has a classifier - actually we don't  need to re-run at all unless *classifier* has changed, but that's hard, we'd have to run the old one and `toString` the classifier, and then check it against the new one... nah.
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
      this.tagsService.dataService.status = 'unsynced'; // We know we're going to have to update the tag, but if `runClassifierOnAllNotes` takes a long time (and is synchronous) we want the sync animation to change immediately before that starts.
      localTag.updateProgFuncString(latestTagData.progFuncString);
      localTag.runClassifierOnAllNotes();
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
