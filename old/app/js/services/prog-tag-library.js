'use strict';

angular.module('nutmeg').factory('progTagLibrary', [
function (
) {

  var progTagLibrary = {
    library: [
      {
        name: 'Untagged',
        description: 'Applies tag to all notes which have no tags',
        code: '// return true if note should contain tag "TAGNAME". example: programmatically tag untagged notes\n\nif (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one!\n  return true;\n}\nelse {\n  return false;\n}'
      },
      {
        name: 'Simple text search',
        description: 'Applies tag to all notes which contain the tag\'s name',
        code: '// return true if note should contain tag "TAGNAME". example:\n\nif (note.body.indexOf("TAGNAME") !== -1) {\n  return true;\n}\nelse {\n  return false;\n}'
      },
      {
        name: 'List',
        description: 'Applies tag to notes where the majority of lines appear to be items in a list',
        code: ''
      }
      // '// return true if note should contain tag \"TAGNAME\". example: programmatically create a general \"nutmeg\" parent tag.\n\n// let\'s also use some lo-dash/underscore\n\nvar noteTagNames = _.map(note.tags, function(tagId) {\n  return getTagNameById(tagId);\n});\n\nvar nutmegTags = ["nutmeg bugs", "nutmeg features", "nutmeg faq", "nutmeg shortcodes", "nutmeg inspiration"];\n\nvar intersection = _.intersection(nutmegTags, noteTagNames);\n\nif (intersection.length) {\n  return true;\n}\nelse {\n  return false;\n}',
      
    ],

    info: '\n/**\n * example `note` argument:\n *\n * {\n *   id: 42, // won\'t change\n *   body: "the text of the note...",\n *   created: 1420250076086,\n *   modified: 1420250076108,\n *   private: false,\n *   tags: [3, 12, 35] // tag IDs\n * }\n *\n * also in scope:\n * \n * - this: the current tag object, e.g. {id: 17, name: the tag\'s name"}\n * - getTagNameById(id): function returning tag name from tag ID\n * - _: lo-dash library\n *\n */'
  };

  return progTagLibrary;

}]);