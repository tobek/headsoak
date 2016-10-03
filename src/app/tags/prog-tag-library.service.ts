import {Injectable} from '@angular/core';

import {TagsService} from './tags.service';
import {Tag} from './tag.model';
// import {Note} from '../notes/note.model';

@Injectable()
export class ProgTagLibraryService {
  librarySourceData = [
    {
      id: 'library:untagged',
      name: 'untagged',
      description: 'Applies tag to all notes which have no tags',
      prog: true,
      progFuncString: 'if (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one! note that without this check, this smart tag would produce an infinite loop. First an untagged note would be assigned this tag, and then, since the note was updated, it would be checked against smart tags again. This tag would then remove itself, triggering another update where it would be added back, etc.\n  return true;\n}\nelse {\n  return false;\n}',
      currentTagId: null
    },
    {
      id: 'library:has-quote',
      name: 'has quote',
      description: '@TODO',
      prog: true,
      progFuncString: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\n\');\nvar numQuoteLines = 0;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\') {\n    numQuoteLines++;\n  }\n});\n\nif (numQuoteLines/lines.length >= 0.5) {\n  return true;\n} else {\n  return false;\n}',
      currentTagId: null
    },
    {
      id: 'library:nutmeg',
      name: 'nutmeg', // @TODO/prog Mention or show that this is a "tutorial" tag or something. BETTER: Make it customizable for search string
      description: 'Applies tag to all notes which contain the text "nutmeg"',
      prog: true,
      progFuncString: 'if (note.body.toLowerCase().indexOf("nutmeg") !== -1) {\n  return true;\n}\nelse {\n  return false;\n}',
      currentTagId: null
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
      return new Tag(tagData, this.tagsService.dataService);
    });
  }
}
