import {Injectable} from '@angular/core';

import {Logger, fuzzyMatchSort} from './';
import {TagsService} from '../tags/tags.service';
import {Tag, SubTag} from '../tags';

import * as _ from 'lodash';

const jQuery = require('jquery');
// window['jQuery'] = jQuery;

type SuggestionType = {
  value: string,
  score?: number;
  highlighted?: string,
  data?: {
    tag?: Tag,
    subTag?: string,
  },
};

@Injectable()
export class AutocompleteService {

  private _logger: Logger = new Logger(this.constructor.name);

  // When adding tags to a note, option to create a new tag with the currently-entered text will appear above any suggestions with a score worse (great) than this threshold
  private NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD = 5;

  constructor(
    private tagsService: TagsService
  ) {}

  // TypeScript's new checking for destructuring function parameter object literal: `el` required, `excludeTags` not and defaults to null, etc.
  autocompleteTags({
    el,
    excludeTags = [],
    excludeTagIds = [],
    context = null,
    autocompleteOpts = {},
  } = {
    el: HTMLInputElement,
    excludeTags: [], // should be `Tag[]` but typescript is throwing an error
    excludeTagIds: [''],
    context: '',
    autocompleteOpts: {}, // should be `any` but can't be found...?
  }) {
    // While we're iterating through tags creating lookup list, we can build this too:
    const subTags: SuggestionType[] = [];

    var lookupArray: SuggestionType[] = _.filter(this.tagsService.tags, (tag: Tag) => {

      if (context === 'note') {
        if (tag.readOnly) {
          return false; // can't add readOnly tags
        }

        // @TODO also hide prog tags here? on the one hand, trying to add a prog tag shows progTagCantChangeAlert, so you might ask "why did you put it in autocomplete in the first place?". on the other hand, if we hide it, users might be like "why isn't this tag showing up?"
      }

      if (_.includes(excludeTags, tag) || _.includes(excludeTagIds, tag.id)) {
        return false;
      }

      // These only work in NoteQueryComponent so far (and anyway since subTags currently only are for prog tags, they can't be added to a note context yet)
      if (context === 'query' && tag.subTagDocs) {
        _.each(tag.subTagDocs, (docs: string[], subTagName: string) => {
          subTags.push({
            value: tag.name + ': ' + subTagName,
            data: {
              tag: new SubTag(subTagName, tag)
            }
          });
        });
      }

      return true;
    }).map((tag: Tag) => {
      return { value: tag.name, data: { tag: tag } };
    });

    lookupArray = _.concat(lookupArray, subTags);

    this._logger.log('Initializing autocomplete with:', lookupArray);

    jQuery(el).autocomplete({
      lookup: lookupArray,
      width: 150,
      autoSelectFirst: true,
      triggerSelectOnValidInput: false,
      allowBubblingOnKeyCodes: [27], // escape key

      customLookup: (query: string, suggestions: SuggestionType[]): SuggestionType[] => {
        var results = fuzzyMatchSort(query, suggestions);

        // On notes, offer option to add new tag with currently-entered query
        if (context === 'note') {
          var newTagOption = {
            value: query,
            highlighted: '<i>new tag "<b>' + query + '</b>"</i>' // what is actually displayed
          };

          for (var i = 0; i < results.length + 1; i++) { // length+1 to go past end and see if we haven't hit threshold yet
            if (i === results.length || results[i].score > this.NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD) {
              results.splice(i, 0, newTagOption);
              break;
            }
          }
        }

        return results;
      },

      formatResult: (suggestion: SuggestionType) => suggestion.highlighted,

      onSelect: (suggestion: SuggestionType, e) => {
        if (autocompleteOpts['onSelect']) {
          autocompleteOpts['onSelect'](suggestion, e);
        }
      },
    });
  }
}
