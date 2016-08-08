import {Injectable} from '@angular/core';

import {Logger, fuzzyMatchSort} from './';
import {Tag, TagsService} from '../tags';

const jQuery = require('jquery');
// window['jQuery'] = jQuery;

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
    var lookupArray: string[] = _.filter(this.tagsService.tags, (tag: Tag) => {
      if (context === 'note') {
        if (tag.readOnly) {
          return false; // can't add readOnly tags
        }

        // @TODO also hide prog tags here? on the one hand, trying to add a prog tag shows progTagCantChangeAlert, so you might ask "why did you put it in autocomplete in the first place?". on the other hand, if we hide it, users might be like "why isn't this tag showing up?"

        // @TODO/rewrite        
        // if (nut.tags) {
        //   // filter out tags that are already on this nut
        //   if (nut.tags.indexOf(tag.id) !== -1) return false; 
        // }
      }

      if (_.includes(excludeTags, tag) || _.includes(excludeTagIds, tag.id)) {
        return false;
      }

      return true;
    }).map((tag: Tag) => tag.name);

    this._logger.log('Initializing autocomplete with:', lookupArray);

    jQuery(el).autocomplete({
      lookup: lookupArray,
      width: 150,
      autoSelectFirst: true,
      triggerSelectOnValidInput: false,
      allowBubblingOnKeyCodes: [27], // escape key

      customLookup: (query, suggestions) => {
        // `map` because suggestions is array of {value: "string"} objects
        var results = fuzzyMatchSort(query, suggestions.map((s) => s.value));

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

      formatResult: (suggestion) => suggestion.highlighted,

      onSelect: (suggestion, e) => {
        if (autocompleteOpts['onSelect']) {
          autocompleteOpts['onSelect'](suggestion, e);
        }
      },
    });
  }
}
