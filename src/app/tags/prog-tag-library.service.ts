import {Injectable} from '@angular/core';

// import {Tag} from './tag.model';
// import {Note} from '../notes/note.model';

@Injectable()
export class ProgTagLibraryService {
  library = [
    {
      name: 'Untagged',
      description: 'Applies tag to all notes which have no tags',
      code: 'if (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one! note that without this check, this smart tag would produce an infinite loop. First an untagged note would be assigned this tag, and then, since the note was updated, it would be checked against smart tags again. This tag would then remove itself, triggering another update where it would be added back, etc.\n  return true;\n}\nelse {\n  return false;\n}'
    },
    {
      name: 'Has quote',
      description: '@TODO',
      code: 'if (! note.body) {\n  return false;\n}\n\nvar lines = note.body.split(\'\n\');\nvar numQuoteLines = 0;\n\n_.each(lines, function(line) {\n  if (line[0] === \'>\') {\n    numQuoteLines++;\n  }\n});\n\nif (numQuoteLines/lines.length >= 0.5) {\n  return true;\n} else {\n  return false;\n}'
    },
    {
      name: 'Simple text search (tutorial example)',
      description: 'Applies tag to all notes which contain the tag\'s name',
      code: 'if (note.body.indexOf(this.name) !== -1) {\n  return true;\n}\nelse {\n  return false;\n}'
    },
    // {
    //   name: 'List',
    //   description: 'Applies tag to notes where the majority of lines appear to be items in a list',
    //   code: ''
    // },
    // '// programmatically create a general \"nutmeg\" parent tag.\n\n// let\'s also use some lo-dash/underscore\n\nvar noteTagNames = _.map(note.tags, function(tagId) {\n  return getTagNameById(tagId);\n});\n\nvar nutmegTags = ["nutmeg bugs", "nutmeg features", "nutmeg faq", "nutmeg shortcodes", "nutmeg inspiration"];\n\nvar intersection = _.intersection(nutmegTags, noteTagNames);\n\nif (intersection.length) {\n  return true;\n}\nelse {\n  return false;\n}',
  ];

  constructor() {
  }
}
