import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {Setting, Shortcut} from './';
import {ActiveUIsService} from '../active-uis.service';
import {ModalService} from '../modals/modal.service';
import {DataService} from '../data.service';
import {NOTE_BROWSER_ROUTES} from '../app.routes';

import {Logger, utils} from '../utils/';

import * as _ from 'lodash';

@Injectable()
export class SettingsService {
  initialized$ = new ReplaySubject<void>(1);

  data: { [key: string]: Setting | Shortcut} = {};

  private settingsSourceData = [
    {
      id: 'bgImageUrl',
      default: null,
      name: 'Background image URL',
      type: 'string',
      section: 'settings',
      enact: function() {
        // @TODO/settings/bg Check it's a URL and that it fetches (validation property function!) - also, it should load the image fully and then fade it in

        const el = <HTMLElement> document.querySelector('#app-bg');

        if (this.value) {
          el.style.backgroundImage = this.value ? 'url("' + this.value + '")' : '';
          el.classList.remove('default');
        }
        else {
          el.classList.add('default');
          el.style.backgroundImage = '';
        }
      },
      clickHandler: function(event: MouseEvent) {
        if (! (<HTMLElement> event.target).classList.contains('random')) {
          return;
        }

        let newBgUrl;
        do {
          newBgUrl = _.sample(this['EXAMPLE_BG_URLS']);
        } while (newBgUrl === this.value);

        // @TODO/settings/bg Would be nice if it alerted to credit the artist
        this.updated(newBgUrl);
      },

      EXAMPLE_BG_URLS: [
        'http://thereitwas.com/images/russian/Nikolay Dubovskoy - 1890 - Quieting Down.jpg',
        'http://thereitwas.com/images/hyperdude111 - Buzz - 2560x1440.jpg',
        'http://thereitwas.com/images/The Fox is Black - Desktop Wallpaper Project/Adam-Hanson-2560x1440.jpeg',
        'http://thereitwas.com/images/The Fox is Black - Desktop Wallpaper Project/chris-jaurique-2560x1440.jpg',
        'http://thereitwas.com/images/The Fox is Black - Desktop Wallpaper Project/upso-1920x1200.jpg',
        'https://s3.amazonaws.com/static.headsoak.com/img/bg/Hokusai_1760-1849_Ocean_waves-huge.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/a/a6/Rosette%2C_Titles_of_Sha_Jahan.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/d/d5/Vincent_van_Gogh_-_Wheatfield_with_a_reaper_-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/a/a3/Gustav_Klimt_-_Beech_Grove_I_-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/5/50/John_Martin_-_The_Great_Day_of_His_Wrath_-_Google_Art_Project.jpg',

        // @TODO/ece maybs not?
        // 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Extermination_of_Evil_Vaisravana.jpg',
        // 'https://upload.wikimedia.org/wikipedia/commons/8/8a/Darvasa_gas_crater_panorama.jpg',
        // 'https://upload.wikimedia.org/wikipedia/commons/6/69/MarsSunset.jpg',
      ],
      postSettingHtml: '<a class="text-link random">Random background</a>',
    },

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
      id: 'addAnotherTag',
      default: true,
      name: 'Add another tag by default',
      description: 'If this setting is enabled, then when you have added a new tag to a note, your cursor will remain in the tag area in order to continue adding tags. Holding ctrl or shift while pressing enter will add the tag and move your cursor to the note text instead.\n\nIf this option is disabled, the behavior is reversed: hold shift or ctrl in order to remain in the add tag area.',
      type: 'boolean',
      section: 'settings'
    },

    {
      // @TODO/polish @TODO/settings This should be hidden on mobile as it has no effect there!
      id: 'minimalistHeader',
      default: false,
      name: 'Minimalist header',
      description: 'Hide the note search bar unless it\'s in use.',
      type: 'boolean',
      bodyClass: true,
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
      // Can manually enable on account with: `dataService.settings.data.errorDebugging.updated(true)`
      id: 'errorDebugging',
      default: false,
      name: 'Error debugging',
      description: 'Pop up toasters for any JS errors that occur.',
      type: 'boolean',
      section: 'settings',
      overkill: true,
      enact: function() {
        if (! this.value) {
          delete window['hsDebugError'];
          return;
        }

        window['hsDebugError'] = (severity: string, info: string, label: string) => {
          if (severity === 'warn') {
            return;
          }
          this.dataService.toaster.error('Click for full error info', 'JS Error', {
            timeOut: 10000,
            preventDuplicates: true,
            onclick: () => {
              this.dataService.modalService.alert(
                '<p>Severity/type: <b>' + severity + '</b></p>' +
                '<pre class="syntax">' + info + '</pre>' +
                (label ? ('<pre class="syntax">' + label + '</pre>') : '') +
                '<p>See console for logged objects. This error has been reported.<p>',
                true,
                'Damn'
              );
            }
          });
        }
      },
    },
    {
      id: 'maxHistory',
      default: 0,
      name: 'Note history length',
      description: 'How many revisions of each note to save. 0 disables history. TOTALLY DISABLED FOR NOW.',
      type: 'integer', // integer not supported yet in UI
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

  private accountSettingsSourceData = [
    {
      id: 'profileImageUrl',
      default: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      name: 'Profile image URL',
      type: 'string',
      section: 'account',

      clickHandler: function(event: MouseEvent) {
        if (! (<HTMLElement> event.target).classList.contains('random')) {
          return;
        }

        let newProfileUrl;
        do {
          newProfileUrl = _.sample(this['EXAMPLE_PROFILE_URLS']);
        } while (newProfileUrl === this.value);

        // @TODO/settings Would be nice if it alerted to credit the artist
        this.updated(newProfileUrl);
      },

      EXAMPLE_PROFILE_URLS: [
        'https://upload.wikimedia.org/wikipedia/en/thumb/d/d3/P.G._Wodehouse_-_My_Man_Jeeves_-_1st_American_edition_%281920_printing%29_-_Crop.jpg/151px-P.G._Wodehouse_-_My_Man_Jeeves_-_1st_American_edition_%281920_printing%29_-_Crop.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/John_Bauer_-_Princess_Tuvstarr_gazing_down_into_the_dark_waters_of_the_forest_tarn._-_Google_Art_Project.jpg/238px-John_Bauer_-_Princess_Tuvstarr_gazing_down_into_the_dark_waters_of_the_forest_tarn._-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/William_Blake_-_Sconfitta_-_Frontispiece_to_The_Song_of_Los.jpg/184px-William_Blake_-_Sconfitta_-_Frontispiece_to_The_Song_of_Los.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Europe_a_Prophecy%2C_copy_D%2C_object_1_%28Bentley_1%2C_Erdman_i%2C_Keynes_i%29_British_Museum.jpg/176px-Europe_a_Prophecy%2C_copy_D%2C_object_1_%28Bentley_1%2C_Erdman_i%2C_Keynes_i%29_British_Museum.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Newton-WilliamBlake.jpg/312px-Newton-WilliamBlake.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/62/Denslow%27s_Humpty_Dumpty_1904.jpg/185px-Denslow%27s_Humpty_Dumpty_1904.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/The_Journey2.jpg/158px-The_Journey2.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Signac_-_Portrait_de_F%C3%A9lix_F%C3%A9n%C3%A9on.jpg/301px-Signac_-_Portrait_de_F%C3%A9lix_F%C3%A9n%C3%A9on.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Table-cloth_2008-1.jpg/320px-Table-cloth_2008-1.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Le_repr%C3%A9sentant_du_peuple_Fran%C3%A7ois_en_fonction2.jpg/169px-Le_repr%C3%A9sentant_du_peuple_Fran%C3%A7ois_en_fonction2.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Genthe_nude_edit.jpg/165px-Genthe_nude_edit.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Rosette%2C_Titles_of_Sha_Jahan.jpg/164px-Rosette%2C_Titles_of_Sha_Jahan.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/17.17-37-1969-Kaukasisk-broderi.jpg/219px-17.17-37-1969-Kaukasisk-broderi.jpg',
        'http://thereitwas.com/images/avatars/agho100x100.jpg',
        'http://thereitwas.com/images/avatars/pinkeyeosmu.png',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Nrol-39.jpg/240px-Nrol-39.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Quentin_Matsys_-_A_Grotesque_old_woman.jpg/182px-Quentin_Matsys_-_A_Grotesque_old_woman.jpg',
        'https://upload.wikimedia.org/wikipedia/en/thumb/f/f3/Franti%C5%A1ek_Kupka_-_Katedr%C3%A1la_-_Google_Art_Project.jpg/199px-Franti%C5%A1ek_Kupka_-_Katedr%C3%A1la_-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/Middleton_Manigault_-_The_Rocket_%281909%29.jpg/288px-Middleton_Manigault_-_The_Rocket_%281909%29.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Leonardo_da_Vinci_-_Saint_John_the_Baptist_C2RMF_retouched.jpg/185px-Leonardo_da_Vinci_-_Saint_John_the_Baptist_C2RMF_retouched.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Triple_Portrait_of_Cardinal_de_Richelieu_probably_1642%2C_Philippe_de_Champaigne.jpg/300px-Triple_Portrait_of_Cardinal_de_Richelieu_probably_1642%2C_Philippe_de_Champaigne.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b2/Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project.jpg/197px-Vincent_van_Gogh_-_Self-Portrait_-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/Hans_Baldung_Grien_-_Portrait_of_a_Man_-_Google_Art_Project.jpg/195px-Hans_Baldung_Grien_-_Portrait_of_a_Man_-_Google_Art_Project.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Antoine_Vollon_-_Mound_of_Butter_-_National_Gallery_of_Art.jpg/292px-Antoine_Vollon_-_Mound_of_Butter_-_National_Gallery_of_Art.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Paul_Gauguin_-_Self-Portrait_with_Halo_and_Snake.jpg/154px-Paul_Gauguin_-_Self-Portrait_with_Halo_and_Snake.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0e/Gilbert_Stuart_-_Catherine_Brass_Yates.jpg/199px-Gilbert_Stuart_-_Catherine_Brass_Yates.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7d/Bacon_by_Gray_257.jpg/192px-Bacon_by_Gray_257.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Jan_van_Eyck_-_Kardinal_Niccol%C3%B2_Albergati_-_Google_Art_Project.jpg/187px-Jan_van_Eyck_-_Kardinal_Niccol%C3%B2_Albergati_-_Google_Art_Project.jpg',
      ],
      postSettingHtml: '<a class="text-link random">Random avatar</a>',
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
          this.activeUIs.noteBrowser.goToNewNote();
        }
      },
      routeTo: NOTE_BROWSER_ROUTES,
      ngZone: true,
      section: 'shortcuts',
      subSection: 'Notes',
    },
    {
      id: 'sNewNoteAddTag',
      name: 'New note, add tag',
      description: 'Create a new note and immediately open the input field to add a tag to that note.',
      default: 'shift+n',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          this.activeUIs.noteBrowser.goToNewNoteAddTag();
        }
      },
      routeTo: NOTE_BROWSER_ROUTES,
      ngZone: true,
      section: 'shortcuts',
      subSection: 'Notes',
    },
    {
      id: 'sOpenNote',
      // @TODO/ece Expand? Focus? Open? Also note action icon.
      name: 'Expand note',
      description: 'Opens note in full screen no-distractions mode',
      default: 'o',
      fn: () => {
        if (this.activeUIs.focusedNoteComponent) {
          this.activeUIs.focusedNoteComponent.openNote();
        }
      },
      ngZone: true,
      section: 'shortcuts',
      subSection: 'Notes',
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
      subSection: 'Notes',
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
      ngZone: true,
      section: 'shortcuts',
      subSection: 'Notes',
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
      subSection: 'Notes',
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
      subSection: 'Notes',
    },

    {
      id: 'sSearch',
      name: 'Go to search bar',
      default: 'l',
      fn: () => {
        if (this.activeUIs.noteQuery) {
          this.activeUIs.noteQuery.focus();
        }
      },
      // @TODO/shortcuts Ideally this should work in tag browser and highlight that search field instead. Would need a more complicated `routeTo` implementation, and check route and find tag browser in activeUIs instead. Also, the constant SEARCHABLE_ROUTES in NoteQueryComponent would have to be updated too.
      section: 'shortcuts',
      subSection: 'Search',
    },
    {
      id: 'sClearSearch',
      name: 'Clear search bar',
      default: '0',
      fn: () => {
        if (this.activeUIs.noteQuery) {
          this.activeUIs.noteQuery.clearAndEnsureRoute();
        }
      },
      // @TODO/shortcuts Ditto note on `sSearch`
      ngZone: true,
      section: 'shortcuts',
      subSection: 'Search',
    },

    {
      id: 'sGoToFirstNote',
      name: 'Go to first note',
      default: '1',
      fn: () => {
        if (this.activeUIs.noteBrowser) {
          const noteComponents = this.activeUIs.noteBrowser.noteComponents;
          let noteComponent = noteComponents.first;

          if (! noteComponent) {
            // No notes
            return;
          }

          if (noteComponent.note.new || ! noteComponent.note.body) {
            // Get the second cause the first is an empmty new note
            noteComponent = noteComponents.find((item, i) => i === 1);
          }

          if (noteComponent) {
            noteComponent.bodyFocus();
          }
        }
      },
      routeTo: NOTE_BROWSER_ROUTES,
      section: 'shortcuts',
      subSection: 'Notes',
    },
    // @TODO/shortcuts Should 2-9 jump to appropriate note on note browser? Should 1 go to "open note", 2 go to first in browser, etc.? Or, 0 could be open note and diff shortcut for clear search, 1 could be first in browser, etc

    {
      id: 'sSearchAlt',
      name: 'Go to search bar (alt)',
      default: '/',
      fn: () => {
        if (this.activeUIs.noteQuery) {
          this.activeUIs.noteQuery.focus();
        }
      },
      global: false,
      overkill: true, // @TODO: not really overkill but just don't show in shortcuts modal. really this calls for ability to do noMod inside shortcut controls so that they can set this instead of mod+f or whatever, and then this should be default
      noMod: true,
      // @TODO/shortcuts Ditto note on `sSearch`
      keyEvent: 'keyup', // otherwise we move to search bar on keydown and then a '/' is typed cause of keydown
      section: 'shortcuts',
    },

    {
      id: 'sUnfocus',
      name: 'Unfocus',
      description: 'Unfocuses from any input/textarea, closes any open modal.',
      default: 'esc',
      fn: () => {
        if (this.modalService.isVisible) {
          this.modalService.cancel();
          return;
        }

        // @TODO Focusing on #blur-hack prevents user from using arrow keys to scroll, and triggering click on window or other element doesn't seem to help.
        (<HTMLInputElement> document.querySelector('#blur-hack')).focus();
      },
      ngZone: true,
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
    private activeUIs: ActiveUIsService,
    private modalService: ModalService
  ) {}

  /** Initialize settings using `settingsData`: existing settings stored for this user in data store. */
  init(settingsData: any, dataService: DataService): void {
    this.dataService = dataService;

    if (_.isEmpty(settingsData)) {
      settingsData = {};
    }

    _.each(this.settingsSourceData, _.partial(this.initSetting, settingsData).bind(this));
    _.each(this.accountSettingsSourceData, _.partial(this.initSetting, settingsData).bind(this));
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

  get(settingId: string, fallback = undefined) {
    if (this.data[settingId]) {
      return this.data[settingId].value;
    }
    else {
      return fallback;
    }
  }

  set(settingId: string, newVal: any) {
    if (this.data[settingId]) {
      this.data[settingId].updated(newVal);
    }
  }

  clear(): void {
    this.data = {};
  }
}
