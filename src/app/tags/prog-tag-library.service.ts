import {Injectable} from '@angular/core';

import {TagsService} from './tags.service';
import {Tag} from './tag.model';
// import {Note} from '../notes/note.model';

import {Logger} from '../utils/logger';

@Injectable()
export class ProgTagLibraryService {
  /** @NOTE Changing IDs in source code here could really mess things up for users who are using them. */
  librarySourceData = [
    {
      id: 'lib--sentiment',
      isLibraryTag: true,
      readOnly: true,
      name: 'sentiment',
      description: 'Tag notes that show a markedly positive or negative sentiment. Hover over the tag on a note to see the calculated strength of that note\'s sentiment.',
      prog: true,
      progFuncString: '// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm\'s `sentiment` module) have been bundled with the app.\nvar sentiment = api.lib.sentiment;\n\nvar score = sentiment(note.body);\nif (score && score.comparative) {\n  score = Math.round(score.comparative * 1000) / 1000;\n}\nelse {\n  score = 0;\n}\n\nvar value;\nif (score >= 0.1) {\n  value = \'positive\';\n}\nelse if (score <= -0.1) {\n  value = \'negative\';\n}\nelse {\n  return false;\n}\n\nreturn {\n  subTag: value,\n  score: score,\n};',
    },
    {
      id: 'lib--untagged',
      isLibraryTag: true,
      readOnly: true,
      name: 'untagged',
      description: 'Tag all notes which have no tags',
      prog: true,
      progFuncString: 'if (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one! note that without this check, this smart tag would produce an infinite loop. First an untagged note would be assigned this tag, and then, since the note was updated, it would be checked against smart tags again. This tag would then remove itself, triggering another update where it would be added back, etc.\n  return true;\n}\nelse {\n  return false;\n}',
    },
    {
      id: 'lib--has-quote',
      isLibraryTag: true,
      readOnly: true,
      name: 'has quote',
      description: 'Tag all notes which contain quotes. This is calculated by looking to see if at least one line in the note follows the Markdown syntax for blockquotes: starting a line with "> ".',
      prog: true,
      // old version which looks for 50% of lines being a quote:
      // progFuncString: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\\n\');\nvar numQuoteLines = 0;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\') {\n    numQuoteLines++;\n  }\n});\n\nif (numQuoteLines / lines.length >= 0.5) {\n  return true;\n} else {\n  return false;\n}',
      progFuncString: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\\n\');\nvar foundQuote = false;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\' && line[1] === \' \') {\n    foundQuote = true;\n    return false;\n  }\n});\n\nreturn foundQuote;',
    },
    {
      id: 'lib--nutmeg',
      isLibraryTag: true,
      readOnly: true,
      name: 'mentions headsoak', // @TODO/prog Mention or show that this is a "tutorial" tag or something. BETTER: Make it customizable for search string
      description: 'Tag all notes which contain the text "headsoak"',
      prog: true,
      progFuncString: 'if (note.body.toLowerCase().indexOf("headsoak") !== -1) {\n  return true;\n}\nelse {\n  return false;\n}',
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
    private tagsService: TagsService
  ) {
    this.library = _.map(this.librarySourceData, (tagData) => {
      const existingTag = this.tagsService.tags[tagData.id];

      if (existingTag) {
        // This tag is being used by the user, so let's pick that up in order to get `docs` list etc.

        if (existingTag.progFuncString !== tagData.progFuncString) {
          // Function has been updated from official sources since user last used it, so let's update.
          // @TODO/prog Haven't tested this code, though should be pretty straightforward.
          // @TODO/ece Should we update the user that this has happened? Maybe a toaster notif. I don't know how frequently it would happen. Ditto for name change (but prob not description change) below
          this._logger.info('Enabled smart tag library tag"' + existingTag.id + '"source has been updated - re-running it now.');
          existingTag.updateProgFuncString(tagData.progFuncString);
          existingTag.runProgOnAllNotes();
        }
        if (existingTag.name !== tagData.name || existingTag.description !== tagData.description) {
          existingTag.name = tagData.name;
          existingTag.description = tagData.description;
          existingTag.updated(false);
        }

        return existingTag;
      }
      else {
        return new Tag(tagData, this.tagsService.dataService);
      }
    });
  }
}
