import {Injectable, NgZone} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import {Setting, Shortcut} from './';
import {ActiveUIsService} from '../active-uis.service';
import {DataService} from '../';

import {Logger, utils} from '../utils/';

@Injectable()
export class SettingsService {
  initialized$ = new Subject<void>();

  addQueryTagsToNewNuts: boolean;
  tagChangesChangeNutModifiedTimestamp: boolean;
  nutChangesChangeTagModifiedTimestamp: boolean;
  showNoteIds: boolean;
  maxHistory: number;

  // internal use
  nutSortBy: string; // see IDs in notesService.sortOpts
  tagSortBy: string; // see IDs in tagsService.sortOpts

  data: { [key: string]: Setting | Shortcut} = {};

  private settingsSourceData = [
    {
      id: 'addQueryTagsToNewNuts',
      default: true,
      name: 'Add filtered tags to new notes',
      description: 'If this is checked, new notes created while searching for certain tags will have those tags too.',
      type: 'boolean', // only boolean supported for now
      section: 'settings'
    },

    {
      id: 'tagChangesChangeNutModifiedTimestamp',
      default: false,
      name: 'Tagging updates note timestamps',
      description: 'If this is checked then adding, removing, and renaming tags will change the "modified" timestamp of notes they are attached to.',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'nutChangesChangeTagModifiedTimestamp',
      default: true,
      name: 'Editing notes updates tag timestamps',
      description: 'If this is checked then whenever you edit a note, it will change the "modified" timestamp (used e.g. to sort by \'recently used\') of all tags on that note.',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'showNoteIds',
      default: false,
      name: 'Show note IDs',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'maxHistory',
      default: 0,
      name: 'Note history length',
      description: 'How many revisions of each note to save. 0 disables history. TOTALLY DISABLED FOR NOW.',
      type: 'integer', // integer not supported yet in UI
      // section: 'settings',
      section: 'settings',
      overkill: true
    },


    // Settings for internal use:
    {
      id: 'nutSortBy',
      default: '0-modified-true', // see IDs in n.sortOpts
      name: 'Default note sorting',
      type: 'string', // string not supported yet in UI
      section: 'settings',
      internal: true // not visible in UI but set when they choose a sort
    },

    {
      id: 'tagSortBy',
      default: '0-docs.length-true', // see IDs in n.sortOpts
      name: 'Default tag sorting',
      type: 'string', // string not supported yet in UI
      section: 'settings',
      internal: true // not visible in UI but set when they choose a sort
    },
  ];

  private shortcutsSourceData = [
    {
      id: 'sMod',
      name: 'Shorcut modifier key(s)',
      default: 'ctrl+alt',
      section: 'shortcuts',
      internal: true, // not really internal but we show this separately from list of shortcuts
    },
    {
      id: 'sNewNote',
      name: 'New note',
      default: 'n',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.newNote();
        }
      },
      routeTo: '/',
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sNewNoteAddTag',
      name: 'New note, add tag',
      description: 'Create a new note and immediately open the input field to add a tag to that note.',
      default: 'shift+n',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.newNoteAddTag();
        }
      },
      routeTo: '/',
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sDupeNoteTag',
      name: 'Duplicate note tags',
      description: 'Create a new note with the same tags as the currently focused note',
      default: 'd',
      // fn: function() {
      //   var id = $s.n.getFocusedNutID();
      //   if (id) { $s.n.duplicateNoteTags(id); }
      // },
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sDeleteNote',
      name: 'Delete note',
      description: 'Deletes the note that you are currently editing.',
      default: 'backspace',
      // fn: function() {
      //   var id = $s.n.getFocusedNutID();
      //   if (id) { $s.n.deleteNut(id); }
      // },
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sDeleteNoteNoConfirm',
      name: 'Delete note (no confirm)',
      description: 'Deletes the note that you are currently editing. Does not ask \'Are you sure?\'',
      default: 'shift+backspace',
      // fn: function() {
      //   var id = $s.n.getFocusedNutID();
      //   if (id) { $s.n.deleteNut(id, true); }
      // },
      overkill: true,
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sAddTag',
      name: 'Add tag',
      description: 'Adds tag to the note that you are currently editing.',
      default: 't',
      // fn: function() {
      //   var scope = $s.n.getFocusedNutScope();
      //   if (scope) { scope.openAddTagField(); }
      // },
      ngZone: true,
      section: 'shortcuts',
    },

    {
      id: 'sSearch',
      name: 'Go to search bar',
      default: 'l',
      // fn: function() {
      //   $s.q.focus();
      // },
      section: 'shortcuts',
    },
    {
      id: 'sClearSearch',
      name: 'Clear search bar',
      default: '0',
      // fn: function() {
      //   $s.q.clear();
      // },
      ngZone: true,
      section: 'shortcuts',
    },

    {
      id: 'sGoToFirstNote',
      name: 'Go to first note',
      default: '1',
      // fn: function() {
      //   var el = angular.element('#nuts .nut textarea')[0];
      //   if (el) { el.focus(); }
      // },
      section: 'shortcuts',
    },

    {
      id: 'sSearchAlt',
      name: 'Go to search bar (alt)',
      default: '/',
      // fn: function() {
      //   $s.q.focus();
      // },
      global: false,
      overkill: true, // @TODO: not really overkill but just don't show in shortcuts modal. really this calls for ability to do nomod inside shortcut controls so that they can set this instead of mod+f or whatever, and then this should be default
      nomod: true,
      section: 'shortcuts',
    },

    {
      id: 'sUnfocus',
      name: 'Unfocus',
      description: 'Unfocuses from any input/textarea, closes any open modal.',
      default: 'esc',
      // fn: function() {
      //   var nutScope = $s.n.getFocusedNutScope();
      //   if (nutScope) {
      //     if (nutScope.addingTag) {
      //       nutScope.closeAddTagField();
      //       nutScope.focus();
      //     }
      //     else {
      //       nutScope.deactivateNut();
      //     }
      //   }

      //   $timeout($s.m.cancelModal);

      //   // @TODO focusing on #blur-hack prevents user from using arrow keys to scroll
      //   angular.element('#blur-hack')[0].focus();
      // },
      internal: true,
      nomod: true,
      // allowOnModal: true,
      section: 'shortcuts',
    },

    // @TODO: scroll up/down?
  ];

  private _logger: Logger = new Logger(this.constructor.name);
  private dataService: DataService;

  constructor(
    private activeUIs: ActiveUIsService
  ) {}

  init(settingsData: any, dataService: DataService): void {
    this.dataService = dataService;

    _.each(this.settingsSourceData, _.partial(this.initSetting, settingsData).bind(this));
    _.each(this.shortcutsSourceData, _.partial(this.initSetting, settingsData).bind(this));

    this.initialized$.next(null);

    this._logger.log('Initialized -', _.size(settingsData), 'restored from user settings');
  }

  initSetting(settingsData: any, setting: any): void {
    const value = settingsData[setting.id] !== undefined ? settingsData[setting.id] : setting.default;

    setting['value'] = this[setting.id] = value;

    if (setting.section === 'shortcuts') {
      this.data[setting.id] = new Shortcut(setting, this.dataService);
    }
    else {
      this.data[setting.id] = new Setting(setting, this.dataService);
    }
  }
}
