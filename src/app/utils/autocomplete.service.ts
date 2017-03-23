import {Injectable} from '@angular/core';

import {Logger, fuzzyMatchSort} from './';
import {TagsService} from '../tags/tags.service';
import {Tag} from '../tags';

import * as _ from 'lodash';

import * as jQuery from 'jquery';
// window['jQuery'] = jQuery;

export interface AutocompleteSuggestion {
  value: string;
  score?: number;
  highlighted?: string;
  data?: {
    tag?: Tag,
  };
}

@Injectable()
export class AutocompleteService {

  private _logger: Logger = new Logger('AutocompleteService');

  // When adding tags to a note, option to create a new tag with the currently-entered text will appear above any suggestions with a score worse (higher) than this threshold
  // private NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD = 5; // @REMOVED Now that fuzzy match sorter has `MAX_SCORE`, so we can just put new tag in at end

  constructor(
    private tagsService: TagsService
  ) {}

  // TypeScript's new checking for destructuring function parameter object literal: `el` required, `excludeTags` not and defaults to empty array, etc.
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
    const lookupArray: AutocompleteSuggestion[] = _.filter(this.tagsService.tags, (tag: Tag) => {

      if (context === 'note') {
        if (tag.readOnly || tag.internal) {
          return false; // can't add readOnly tags. internal tags can be added through other methods.
          // @TODO/ece @TODO/usertesting Should these be add-able from add tag field autocomplete? actually for now it's easier to keep them removed - some extra behavior for pinning/archiving wouldn't get triggered through normal add tag (though pretty easy to fix)
        }

        // @TODO/ece also hide prog tags here? on the one hand, trying to add a prog tag shows progTagCantChangeAlert, so you might ask "why did you put it in autocomplete in the first place?". on the other hand, if we hide it, users might be like "why isn't this tag showing up?" Or it could be grayed out and/or with tooltip. We'll at least hide child tags.
        if (tag.parentTag) {
          return false;
        }
      }

      if (_.includes(excludeTags, tag) || _.includes(excludeTagIds, tag.id)) {
        return false;
      }

      return true;
    }).map((tag: Tag) => {
      return { value: tag.name, data: { tag: tag } };
    });

    this._logger.log('Initializing autocomplete with:', lookupArray);

    jQuery(el).autocomplete({
      lookup: lookupArray,
      width: 150,
      autoSelectFirst: true,
      triggerSelectOnValidInput: false,
      allowBubblingOnKeyCodes: [27], // escape key

      customLookup: (query: string, suggestions: AutocompleteSuggestion[]): AutocompleteSuggestion[] => {
        const results = fuzzyMatchSort(query, suggestions);

        // On notes, offer option to add new tag with currently-entered query
        if (context === 'note') {
          const newTagOption = {
            value: query,
            highlighted: '<i>new tag "<b>' + query + '</b>"</i>' // what is actually displayed
          };

          // @REMOVED Now that fuzzy match sorter has `MAX_SCORE`, so we can just put new tag in at end
          // for (let i = 0; i < results.length + 1; i++) { // length+1 to go past end and see if we haven't hit threshold yet
          //   if (i === results.length || results[i].score > this.NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD) {
          //     results.splice(i, 0, newTagOption);
          //     break;
          //   }
          // }
          results.push(newTagOption);
        }

        results.forEach((suggestion) => {
          if (suggestion.data && suggestion.data.tag && suggestion.data.tag.prog) {
            suggestion.highlighted += ' <i class="fa fa-bolt"></i>';
          }
        });

        return results;
      },

      formatResult: (suggestion: AutocompleteSuggestion) => suggestion.highlighted,

      onSelect: (suggestion: AutocompleteSuggestion, e) => {
        if (autocompleteOpts['onSelect']) {
          autocompleteOpts['onSelect'](suggestion, e);
        }
      },
    });
  }
}
