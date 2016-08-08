import {Injectable} from '@angular/core';
import {Subject} from 'rxjs/Subject';

import {Setting} from './';
import {DataService} from '../';

import {Logger, utils} from '../utils/';

@Injectable()
export class SettingsService {
  // initialized$ = new Subject<void>();

  // Here we decalre default values

  addQueryTagsToNewNuts = true;;
  tagChangesChangeNutModifiedTimestamp = false;
  nutChangesChangeTagModifiedTimestamp = true;
  showNoteIds = false;
  maxHistory = 0;

  // internal use
  nutSortBy = '0-modified-true'; // see IDs in notesService.sortOpts
  tagSortBy = '0-docs.length-true', // see IDs in tagsService.sortOpts

  data: { [key: string]: Setting } = {};

  info = [
    {
      id: 'addQueryTagsToNewNuts',
      default: true,
      humanName: 'Add filtered tags to new notes',
      description: 'If this is checked, new notes created while searching for certain tags will have those tags too.',
      type: 'boolean', // only boolean supported for now
      section: 'settings'
    },

    {
      id: 'tagChangesChangeNutModifiedTimestamp',
      default: false,
      humanName: 'Tagging updates note timestamps',
      description: 'If this is checked then adding, removing, and renaming tags will change the "modified" timestamp of notes they are attached to.',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'nutChangesChangeTagModifiedTimestamp',
      default: true,
      humanName: 'Editing notes updates tag timestamps',
      description: 'If this is checked then whenever you edit a note, it will change the "modified" timestamp (used e.g. to sort by \'recently used\') of all tags on that note.',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'showNoteIds',
      default: false,
      humanName: 'Show note IDs',
      type: 'boolean',
      section: 'settings'
    },

    {
      id: 'maxHistory',
      default: 0,
      humanName: 'Note history length',
      description: 'How many revisions of each note to save. 0 disables history. TOTALLY DISABLED FOR NOW.',
      type: 'integer', // integer not supported yet in UI
      // section: 'settings',
      section: null, // since it's disabled
      overkill: true
    },


    // internal use
    {
      id: 'nutSortBy',
      default: '0-modified-true', // see IDs in n.sortOpts
      humanName: 'Default note sorting',
      type: 'string', // string not supported yet in UI
      section: null // not visible in UI
    },

    new Setting({
      id: 'tagSortBy',
      default: '0-docs.length-true', // see IDs in n.sortOpts
      humanName: 'Default tag sorting',
      type: 'string', // string not supported yet in UI
      section: null // not visible in UI
    }),
  ]

  private _logger: Logger = new Logger(this.constructor.name);
  private dataService: DataService;

  init(settingsData: Object, dataService: DataService) {
    this.dataService = dataService;

    _.each(this.info, (setting) => {
      if (settingsData[setting.id]) {
        setting.value = this[setting.id] = settingsData[setting.id];
      }

      this.data[setting.id] = new Setting(setting, this.dataService);
    });

    // this.initialized$.next(null);

    this._logger.log('Initialized -', _.size(settingsData), ' restored from user settings');
  }
}
