import {Injectable} from '@angular/core';

import {TagsService} from './tags.service';
import {Tag} from './tag.model';
// import {Note} from '../notes/note.model';

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
      progFuncString: '// @NOTE: Soon you will be able to import your own external resources in order to run your own smart tags that rely on them. At the moment resources such as these (npm\'s `sentiment` module) have been bundled with the app.\nvar sentiment = api.lib.sentiment;\n\nvar score = sentiment(note.body);\nif (score && score.comparative) {\n  score = Math.round(score.comparative * 10000) / 10000;\n}\nelse {\n  score = 0;\n}\n\nvar value;\nif (score >= 0.1) {\n  value = \'positive\';\n}\nelse if (score <= -0.1) {\n  value = \'negative\';\n}\nelse {\n  return false;\n}\n\nthis.noteData[note.id] = {\n  val: value,\n  valHover: score,\n};\n\nreturn true',
    },
    {
      id: 'lib--untagged',
      isLibraryTag: true,
      readOnly: true,
      name: 'untagged',
      description: 'Tag to all notes which have no tags',
      prog: true,
      progFuncString: 'if (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one! note that without this check, this smart tag would produce an infinite loop. First an untagged note would be assigned this tag, and then, since the note was updated, it would be checked against smart tags again. This tag would then remove itself, triggering another update where it would be added back, etc.\n  return true;\n}\nelse {\n  return false;\n}',
    },
    {
      id: 'lib--has-quote',
      isLibraryTag: true,
      readOnly: true,
      name: 'has quote',
      description: '@TODO',
      prog: true,
      progFuncString: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\n\');\nvar numQuoteLines = 0;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\') {\n    numQuoteLines++;\n  }\n});\n\nif (numQuoteLines/lines.length >= 0.5) {\n  return true;\n} else {\n  return false;\n}',
    },
    {
      id: 'lib--nutmeg',
      isLibraryTag: true,
      readOnly: true,
      name: 'mentions nutmeg', // @TODO/prog Mention or show that this is a "tutorial" tag or something. BETTER: Make it customizable for search string
      description: 'Tag all notes which contain the text "nutmeg"',
      prog: true,
      progFuncString: 'if (note.body.toLowerCase().indexOf("nutmeg") !== -1) {\n  return true;\n}\nelse {\n  return false;\n}',
    },
    // {
    //   name: 'List',
    //   description: 'Applies tag to notes where the majority of lines appear to be items in a list',
    //   progFuncString: ''
    // },
    // '// programmatically create a general \"nutmeg\" parent tag.\n\n// let\'s also use some lo-dash/underscore\n\nvar noteTagNames = _.map(note.tags, function(tagId) {\n  return getTagNameById(tagId);\n});\n\nvar nutmegTags = ["nutmeg bugs", "nutmeg features", "nutmeg faq", "nutmeg shortcodes", "nutmeg inspiration"];\n\nvar intersection = _.intersection(nutmegTags, noteTagNames);\n\nif (intersection.length) {\n  return true;\n}\nelse {\n  return false;\n}',
  ];

  library: Tag[];

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
          existingTag.progFuncString = tagData.progFuncString;
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
