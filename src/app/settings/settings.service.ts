import {Injectable, NgZone} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {Setting, Shortcut} from './';
import {ActiveUIsService} from '../active-uis.service';
import {DataService} from '../';

import {Logger, utils} from '../utils/';

@Injectable()
export class SettingsService {
  initialized$ = new ReplaySubject<void>(1);

  data: { [key: string]: Setting | Shortcut} = {};

  private settingsSourceData = [
    {
      id: 'addQueryTagsToNewNuts',
      default: false,
      name: 'Add filtered tags to new notes',
      description: 'If this is checked, new notes created while searching for certain tags will have those tags too.',
      type: 'boolean', // only boolean supported for now
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
      id: 'tagChangesChangeNutModifiedTimestamp',
      default: false,
      name: 'Tagging updates note timestamps',
      description: 'If this is checked then adding or removing a tag to/from a note will update the "modified" timestamp of that note.',
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
        if (this.activeUIs.home) {
          this.activeUIs.home.goToNewNote();
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
        if (this.activeUIs.home) {
          this.activeUIs.home.goToNewNoteAddTag();
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
      fn: () => {
        if (this.activeUIs.focusedNoteComponent) {
          this.activeUIs.focusedNoteComponent.newNoteWithSameTags();
        }
      },
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sDeleteNote',
      name: 'Delete note',
      description: 'Deletes the note that you are currently editing.',
      default: 'backspace',
      fn: () => {
        if (this.activeUIs.focusedNoteComponent) {
          this.activeUIs.focusedNoteComponent.delete();
        }
      },
      // ngZone: true, // not needed cause of the confirmation prompt?
      section: 'shortcuts',
    },
    {
      id: 'sDeleteNoteNoConfirm',
      name: 'Delete note (no confirm)',
      description: 'Deletes the note that you are currently editing. Does not ask \'Are you sure?\'',
      default: 'shift+backspace',
      fn: () => {
        if (this.activeUIs.focusedNoteComponent) {
          this.activeUIs.focusedNoteComponent.delete(true);
        }
      },
      overkill: true,
      ngZone: true,
      section: 'shortcuts',
    },
    {
      id: 'sAddTag',
      name: 'Add tag',
      description: 'Adds tag to the note that you are currently editing.',
      default: 't',
      fn: () => {
        if (this.activeUIs.focusedNoteComponent) {
          this.activeUIs.focusedNoteComponent.initializeAddTag();
        }
      },
      section: 'shortcuts',
    },

    {
      id: 'sSearch',
      name: 'Go to search bar',
      default: 'l',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.queryFocus();
        }
      },
      routeTo: '/', // @TODO/shortcuts Ideally this should work in tag browser and highlight that search field instead. Would need a more complicated `routeTo` implementation, and check route and find tag browser in activeUIs instead.
      section: 'shortcuts',
    },
    {
      id: 'sClearSearch',
      name: 'Clear search bar',
      default: '0',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.queryClear(false);
        }
      },
      routeTo: '/', // @TODO/shortcuts Ditto note on `sSearch`
      ngZone: true,
      section: 'shortcuts',
    },

    {
      id: 'sGoToFirstNote',
      name: 'Go to first note',
      default: '1',
      fn: () => {
        // if (this.activeUIs.noteBrowser) {
        //   this.activeUIs.noteBrowser.noteComponents.first.bodyFocus();
        // }
        if (this.activeUIs.home) {
          this.activeUIs.home.noteComponent.bodyFocus();
        }
      },
      routeTo: '/',
      section: 'shortcuts',
    },
    // @TODO/shortcuts Should 2-9 jump to appropriate note on note browser? Should 1 go to "open note", 2 go to first in browser, etc.? Or, 0 could be open note and diff shortcut for clear search, 1 could be first in browser, etc

    {
      id: 'sSearchAlt',
      name: 'Go to search bar (alt)',
      default: '/',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.queryFocus();
        }
      },
      global: false,
      overkill: true, // @TODO: not really overkill but just don't show in shortcuts modal. really this calls for ability to do noMod inside shortcut controls so that they can set this instead of mod+f or whatever, and then this should be default
      noMod: true,
      onlyOnRoute: '/', // @TODO/shortcuts Ditto note on `sSearch`
      keyEvent: 'keyup', // otherwise we move to search bar on keydown and then a '/' is typed cause of keydown
      section: 'shortcuts',
    },

    {
      id: 'sUnfocus',
      name: 'Unfocus',
      description: 'Unfocuses from any input/textarea, closes any open modal.',
      default: 'esc',
      fn: () => {
        // @TODO Focusing on #blur-hack prevents user from using arrow keys to scroll, and triggeringclick on window or other element doesn't seem to help.
        (<HTMLInputElement> document.querySelector('#blur-hack')).focus();

        // @TODO/rewrite/modals What if they're in a cancellable modal? This could help:
        // utils.simulateClick(document.querySelector('body'));
      },
      internal: true,
      noMod: true,
      // allowOnModal: true,
      section: 'shortcuts',
    },

    // @TODO: scroll up/down note browser?
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

  get(settingId: string) {
    if (this.data[settingId]) {
      return this.data[settingId].value;
    }
    else {
      return undefined;
    }
  }

  set(settingId: string, newVal: any) {
    if (this.data[settingId]) {
      this.data[settingId].updated(newVal);
    }
  }
}
