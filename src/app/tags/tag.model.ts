import {Subscription} from 'rxjs';

import {DataService} from '../data.service';

import {Logger} from '../utils/logger';

import {ChildTag} from './';
import {PublicTag} from './public-tag.model';
import {Note} from '../notes/';

import * as _ from 'lodash';
import {each as asyncEach} from 'async'; // @TODO/optimization @TODO/build Looks like build isn't pruning things and is loading the entire async library.
import * as safeStringify from 'json-stringify-safe';


/** Information this tag generates about a specific note. */
interface NoteSpecificDatum {
  /** This will be displayed in parentheses after tag name, e.g. `score` might be "50% confidence" and show "nsfw (90% confidence)". @TODO/prog Update component: if no childTag, show score always without hover. */
  score?: any;
  /** Additional stuff can be displayed in the dropdown (unimplemented). */
  more?: string;
}
/** Same as `NoteSpecificDatum` but results in NoteSpecificDatum being attached to a child tag. */
interface NoteSpecificDatumForChildTag {
  /** Will cause a new ChildTag to be created. Child tag name will be displayed after tag name when shown on this note, e.g. for sentiment analysis tag called "sentiment", `childTag` might be "joy" and be displayed as "sentiment: joy" */
  childTag: string;
  /** This will be displayed in parentheses after tag name on hover, e.g. `score` might be "90% confidence" and show "sentiment: joy (90% confidence)". */
  score?: any;
  more?: string;
}

type ClassifierResult = boolean | NoteSpecificDatum | NoteSpecificDatumForChildTag | Array<NoteSpecificDatum | NoteSpecificDatumForChildTag>;
type ClassifierReturnType = ClassifierResult | Promise<ClassifierResult>;

interface Hooks {
  /** App starts up. Note that it's possible that this runs very rarely, e.g. if the user leaves a single browser instance open for a long time. NOT IMPLEMENTED YET. */
  init?: (note: Note) => void;
  /** When the tag is first added to a note. */
  added?: (note: Note) => void;
  /** When the tag is removed from a note. This is also fired when a note the tag is on is deleted, and when the tag itself is deleted it's fired for every note the tag is on. */
  removed?: (note: Note) => void;
  /** When the note is updated (specifically a `fullUpdate`). NOT IMPLEMENTED YET. */
  noteUpdated?: (note: Note) => void;
}

export interface CustomEntry {
  text: string | ((tag: Tag, noteId?: string) => string);
  icon?: string;
  func?: (tag: Tag, event: Event, noteId?: string) => {};
}

export type ProgTagDef = ((note: Note) => ClassifierReturnType) | {
  classifier?: (note: Note) => ClassifierReturnType;
  hooks?: Hooks;
  customEntries?: { [location: string]: CustomEntry[] };
};

export class Tag {
  /** Properties that we save to data store */
  static DATA_PROPS = [
    'id',
    'name',
    'created',
    'modified',
    'description',
    'docs',

    'dataStr',
    'prog',
    'progFuncString',
    'fromLib',
    'noteData',
    'childTagIds',

    'internal',
    'readOnly',
    'share',
    'sharedBy',
  ];

  /** We can't instantiate the tags here cause we have to pass in reference to DataService. So we'll let TagsService instantiate from this data. */
  static INTERNAL_TAG_DATA = {
    PINNED: {
      id: 'pin',
      name: 'pinned',
      internal: true,
    },
    ARCHIVED: {
      id: 'arch',
      name: 'archived',
      internal: true,
    },
  };
  static INTERNAL_TAG_IDS = _.map(Tag.INTERNAL_TAG_DATA, (data) => data.id);


  /** By convention, IDs for user's own tags are numeric strings. These are autogenerated by TagsService when new tags are made. Other tags (previously, shared ones, currently only library tags) have other IDs like `lib--untagged`. Internal tags have IDs defined as constants in `INTERNAL_TAG_DATA`. */
  id: string;

  name = '';

  created = Date.now(); // doesn't actually get called til object is instantiated so time is correct (and of course can be overridden by data passed to constructor)
  modified = Date.now();

  docs: string[] = []; // array of note IDs
  _noteCount: number;
  get noteCount(): number {
    if (this._noteCount === undefined) {
      this._calculateNoteCount(); // not the debounced version - let's get it right away
    }
    return this._noteCount;
  }

  description?: string;

  /** If this is true then you can't change *anything* about this tag - no adding/removing from notes, no renaming, no changing smart tag settings, etc. */
  readOnly?: boolean; // @TODO/sharing handle other permissions

  share?: any; // map of recipient (shared-with) user ID to their permissions
  sharedBy?: string; // ID of user that shared this tag
  shareTooltip?: string; // text to identify sharing status to user (e.g. "you are sharing this with ___" or "___ is sharing this with you")

  /** If this is set, this tag corresponds to some specially implemented feature, such as pinned or archived (and, later, private notes). Unless the user selects otherwise in settings, this tag will be hidden from everywhere (autocomplete when adding tag, tag list on notes) except searching and maybe tag browser (probably different section). */
  readonly internal?: boolean;

  /** If this note is currently in the process of being deleted. Child tags delete themselves when they've been removed from all notes, deleting a tag also removes the tag from notes, so we need this to prevent infinite loop */
  isDeleting: boolean;

  /** Whether we should consider this tag "active" (being searched for in note query, or a parent or child is). */
  isActiveInQuery: boolean;
  /** Specifically this tag, not its parent or child. */
  isSelfActiveInQuery: boolean;


  /** Whether this came from the smart tag library. */
  readonly fromLib?: boolean;

  prog?: boolean; // whether it's a programmatic tag
  progFuncString?: string; // string representing programmatic ta@Tg function to be eval'd. This ccould be present even though `prog` is false, saving the function for potential future use.

  /**
   * Custom actions that prog tags can register, e.g. new stuff in the note tag dropdown.
   *
   * @TODO/prog Document this, e.g. that for both of these `Tag` instance is sent in, and `TagDetailsComponent` is sent in too when in tag details page (that's a big @HACK though so we can update child tags after blacklist, @TODO/soon if tag details could listen for tag updates it could know when to udpate).
   *
   * @TODO/soon @TODO/prog @TODO/ece Is this the right now? Also could be actions, operations,  handlers, customizations...
   */
  customEntries: {
    /** Shows up in tag dropdown on a note. */
    noteTagDropdown?: CustomEntry[],
    /** Shows up in list of child tags in TagDetailsComponent, and on dropdowns of child tags on a note. */
    childTags?: CustomEntry[],
  } = {};

  /** Tag can store specific information on a per-note basis, indexed by note ID. A specific note's data is deleted when the tag is removed from that note. */
  noteData: { [noteId: string]: NoteSpecificDatum } = {};

  childTagIds: string[] = [];

  /** ChildTag overrides this, otherwise it's null for non-child tags. */
  parentTagId = null;

  /** If this is a programmatic tag, this property caches the function that is run to determine if a note should have this tag. */
  classifier?: (note: Note) => ClassifierReturnType;
  /** If this is a programmatic tag, this object caches the functions to be run at various times. */
  hooks?: Hooks = {};


  get fromClassifier(): boolean {
    return !! (this.classifier || (this.parentTag && this.parentTag.classifier));
  }

  protected _logger: Logger;

  private _publicTag: PublicTag;

  /** Free-form persistent data store for prog tags to use. */
  private _data: Object = {};
  private _parentTag: Tag;

  private queryTagsUpdatedSub: Subscription;


  // @TODO how do we handle duplicate names?
  constructor(tagData: any, public dataService: DataService) {
    if (! tagData.id) {
      throw new Error('Must supply tag with id');
    }

    if (tagData.dataStr) {
      tagData.data = JSON.parse(tagData.dataStr);
      delete tagData.dataStr;
    }
    if (tagData.data) {
      // @HACK `data` is actually a setter which updates tag and re-runs programmatic stuff, but if we're just rehydrating a Tag instance then there's no need to do that, so assign it to `_data` instead.
      tagData._data = tagData.data;
      delete tagData.data;
    }

    _.extend(this, tagData);

    this._logger = new Logger('Tag ' + this.id);

    // @TODO/old if `docs` exists, go through and add to each nut?

    if (this.dataService && this.dataService.activeUIs) {
      this.dataService.activeUIs.noteQuery$.first().subscribe((noteQuery) => {
        this.queryTagsUpdatedSub = noteQuery.tagsUpdated$.subscribe(
          this.queryTagsUpdated.bind(this)
        );

        this.queryTagsUpdated(noteQuery.tags); // run once now to get us started
      });
    }
  }

  /** Call this to clear up any shit when deleting ourselves. */
  destroy() {
    if (this.queryTagsUpdatedSub) {
      this.queryTagsUpdatedSub.unsubscribe();
    }
  }


  /** Accessor for free-form persistent data store for prog tags to use. */
  get data(): Object {
    return this._data || {};
  }
  set data(newData: Object) {
    if (! _.isEqual(newData, this._data)) {
      this._data = newData;
      this.classifier && this.runClassifierOnAllNotes();
      this.updated();
    }

    if (! this._data) {
      this._data = {};
    }
  }

  // @TODO/now @TODO/prog THE UPDATE AND RUN PROG SHOULD BE THROTTLED
  /** These should be used by prog tags to ensure that changes are saved to data store and trigger re-running of prog stuff. We use `_.cloneDeep` and vanilla equality test as a kind of poor man's immutability. */
  setData(key: string, data: any) {
    if (data !== this._data[key]) {
      this._data[key] = _.cloneDeep(data);
      this.classifier && this.runClassifierOnAllNotes();
      this.updated();
    }
  }
  removeData(key: string) {
    if (key in this._data) {
      delete this._data[key];
      this.classifier && this.runClassifierOnAllNotes();
      this.updated();
    }
  }
  getData(key: string, defaultValue: any = undefined): any {
    if (key in this._data) {
      return _.cloneDeep(this._data[key]);
    }
    else {
      return defaultValue;
    }
  }

  /** Serialized version of `data` that's safe to store in Firebase. */
  get dataStr(): string {
    if (_.isEmpty(this.data)) {
      return null;
    }

    return safeStringify(this.data);
  }

  get publicTag(): PublicTag {
    if (! this._publicTag) {
      this._publicTag = new PublicTag(this);
    }

    return this._publicTag;
  }


  /** Outputs object of properties that we want to save to the data store. */
  forDataStore(): Object {
    const tagData = {};

    // @NOTE A value must be set to `null` to remove from Firebase. undefined isn't allowed.
    // @TODO/soon Test this works on Tags and ChildTags
    this.constructor['DATA_PROPS'].forEach((prop) => {
      if (this[prop] !== undefined) {
        tagData[prop] = this[prop];
      }
    });

    return tagData;
  }

  updated(updateModified = true): void {
    if (updateModified) {
      this.modified = Date.now();
    }

    this.calculateNoteCount();

    this._logger.log('Updated');

    this.dataService.digest$.emit(this);
  }

  rename(newName: string): void {
    this._logger.log('Renaming to:', newName);
    this.name = newName;
    this.updated();
  }

  /** Returns true if tag was deleted. */
  delete(noConfirm = false): boolean {
    if (this.isDeleting) {
      return false;
    }

    // @TODO/modals
    if (! noConfirm && ! confirm('Are you sure you want to delete the tag "' + this.name + '"? It will be removed from all notes which have this tag, but the notes will remain.\n\nThis can\'t be undone.')) {
      return false;
    }

    this.isDeleting = true;

    this.prog = false; // so that we don't get added back by any programmatic logic when updating note while removing ourselves

    // this.docs.slice() returns a duplicate of the array which is necessary because note.removeTag will call tag.removeNoteId which will modify the array we're iterating over.
    this.docs.slice().forEach((noteId) => {
      this.dataService.notes.notes[noteId].removeTag(this, true, true);
    });

    // @TODO/rewrite/sharing
    // if (this.share && ! this.sharedBy) {
    //   // Shared tag that is shared by the current user
    //   $s.t.unshareTagWithAll(tag);
    // }

    if (this.parentTag) {
      // We're a child tag
      this._logger.log('Being deleted, so removing ourselves from parent tag', this.parentTag);
      this.parentTag.childTagIds = _.without(this.parentTag.childTagIds, this.id);
      this.parentTag.updated(true);
    }

    if (this.childTagIds.length) {
      // We're a parent tag
      this.childTagIds.forEach((childTagId) => {
        const childTag = this.dataService.tags.tags[childTagId];
        if (childTag) {
          this._logger.log('Deleting ourselves, so deleting child tag', childTag);
          childTag.delete(true);
        }
      });
    }

    this.dataService.tags.removeTag(this);

    this._logger.log('Deleted');

    if (this.fromLib) {
      // Tag no longer lives in this.tags but is still referenced by prog tag library and could be used again, so:
      this.docs = []; // makes for cleaner update if user adds tag back in this session
      this.prog = true; // need this back!
    }

    this.destroy();

    return true;
  }

  /** Really just a hack for fixing bugs if you add/remove same tag from smart tag library in same session. */
  reset() {
    this._data = {};
    this.noteData = {};
    delete this.isDeleting;
    delete this.classifier;
  }

  /** @NOTE This does *not* add ourselves to the note in return. Does nothing if tag already has note in `docs`. */
  addNoteId(noteId: string): void {
    if (_.includes(this.docs, noteId)) {
      return;
    }

    this._logger.log('Adding note id', noteId);
    this.docs = _.union(this.docs, ['' + noteId]);

    if (this.hooks.added) {
      this.hooks.added(this.dataService.notes.notes[noteId]);
    }

    this.updated();
  }
  /** @NOTE This does *not* remove ourselves from the note in return. */
  removeNoteId(noteId: string): void {
    this._logger.log('Removing note id', noteId);
    this.docs = _.without(this.docs, '' + noteId);

    if (this.noteData[noteId]) {
      delete this.noteData[noteId];
    }

    if (this.hooks.removed) {
      this.hooks.removed(this.dataService.notes.notes[noteId]);
    }

    if (this.parentTag && this.docs.length === 0) {
      this._logger.log('Deleting no-longer-used child tag');
      this.delete(true);
    }
    else {
      this.updated();
    }
  }

  updateProgFuncString(newFuncString: string): void {
    this.progFuncString = newFuncString;
    this.setUpAndValidateProgTag(true);
  }

  /** See if given note should be tagged by this programmatic tag. */
  runClassifierOnNote(note: Note, doneCb = (err?) => {}): void {
    if (typeof this.classifier !== 'function' || this.isDeleting) {
      return doneCb();
    }

    if (note.new) {
      // Unsaved empty note
      return doneCb();
    }

    const result = this.classifier(note);

    if (result instanceof Promise) {
      result.then((result) => {
        this.handleClassifierResult(note, result);
        doneCb();
      })
      .catch((err) => {
        this.progTagError(err, note);
        doneCb(err);
      });
    }
    else {
      this.handleClassifierResult(note, result);
      doneCb();
    }
  }

  handleClassifierResult(note: Note, result: ClassifierResult): void {
    // We need to detect which tags should *no longer* be on this note. We do that by starting here with a list of all the relevant tags on the note. As we handle the classifier result, tags that get added/remain are removed from this list, such that anything left on it at the end should be removed
    const tagsToRemove = this.getTagAndChildTagsOnNote(note);

    if ((result instanceof Array) || (typeof result === 'object')) {
      this._logger.log('User classifier returned data for note ID', note.id, result);

      (result instanceof Array ? result : [result]).forEach((noteDatum) => {
        this.handleClassifierResultDatum(note, noteDatum, tagsToRemove);
      });
    }
    else if (result) {
      this._logger.log('User classifier returned true for note ID', note.id);
      note.addTag(this, true, true);
      _.pull(tagsToRemove, this);
    }
    else {
      this._logger.log('User classifier returned false for note ID', note.id);
      // `tagsToRemove` will handle the removal
    }

    tagsToRemove.forEach((tag) => {
      this._logger.log('User classifier no longer returned anything for tag', tag, '- removing');
      // `note.removeTag` will ultimately call `this.removeNoteId` which will handle `noteData` and child tags as necessary
      note.removeTag(tag, true, true);
    });
  }

  handleClassifierResultDatum(note: Note, noteDatum: NoteSpecificDatum | NoteSpecificDatumForChildTag, tagsToRemove: Tag[]): void {
    if (typeof noteDatum.score === 'number') {
      noteDatum.score = Math.round(noteDatum.score * 1000) / 1000;
    }

    if (this.isNoteSpecificDatumForChildTag(noteDatum)) {
      const childTagName = noteDatum.childTag;

      let childTag = this.dataService.tags.getTagByName(this.name + ': ' + childTagName);

      if (! childTag) {
        this._logger.log('Creating new child tag:', childTagName);
        childTag = this.dataService.tags.createNewChildTag(childTagName, this);
      }

      // No need to keep `childTag` on note data we add to the child tag - but if there's anything else there we can attach it
      delete noteDatum.childTag;

      // @TODO/temp Check in analytics if this happens in the future and probably can remove or replace with `progTagError`
      if (noteDatum['hooks']) {
        this._logger.error('Smart tag classifier returned result with `hooks` in it!', noteDatum);

        if (window['hsDebugError'] && ! window['hsClassifierHooks']) {
          this.dataService.modalService.alert('Yo Ece, can you let me know this happened and I want to check it out your computer please. (That weird error with classifier returning object with `hooks` happened again.)');
          window['hsClassifierHooks'] = true;
        }

        delete noteDatum['hooks'];
      }

      childTag.attachNoteDatum(note, noteDatum);

      if (! _.includes(this.childTagIds, childTag.id)) {
        this.childTagIds = _.concat(this.childTagIds, childTag.id);
        this.updated(true);
      }

      _.pull(tagsToRemove, childTag);
    }
    else {
      // Just some data to attach to this specific note and tag
      this.attachNoteDatum(note, noteDatum);

      _.pull(tagsToRemove, this);
    }
  }

  /** See "Type Guards and Differentiating Types" in <https://www.typescriptlang.org/docs/handbook/advanced-types.html> */
  isNoteSpecificDatumForChildTag(noteDatum: NoteSpecificDatum | NoteSpecificDatumForChildTag): noteDatum is NoteSpecificDatumForChildTag {
    return (<NoteSpecificDatumForChildTag> noteDatum).childTag !== undefined;
  }

  attachNoteDatum(note: Note, noteDatum: NoteSpecificDatum) {
    noteDatum = _.isEmpty(noteDatum) ? undefined : noteDatum; // undefined to match no noteData for this note when using `_.isEqual`

    const noteDatumChanged = ! _.isEqual(noteDatum, this.noteData[note.id]);

    if (noteDatumChanged) {
      this.noteData[note.id] = noteDatum || null; // null to trigger deletion in Firebase
    }

    if (note.hasTag(this)) {
      // No need to add to note

      this.addNoteId(note.id); // ensure we have it - this will update if necessary

      if (noteDatumChanged) {
        // But we still have to update ourselves to save new noteData
        this.updated(false);
      }
    }
    else {
      note.addTag(this, true, true);
    }
  }

  runClassifierOnAllNotes(cb = (err?) => {}): void {
    if (typeof this.classifier !== 'function' || this.isDeleting) {
      return cb();
    }

    this._logger.log('Running smart tag on all notes');
    this._logger.time('Ran smart tag on all notes in');
    console.groupCollapsed();

    asyncEach(this.dataService.notes.notes, this.runClassifierOnNote.bind(this), (err?) => {
      // @NOTE Since these are potentially async and could take unknown amount of time to complete (maybe they should be time limited?) then other console output could get stuck in here. Not sure what to do! Not that important though since it's just for dev use.
      console.groupEnd();
      this._logger.timeEnd('Ran smart tag on all notes in');
      cb(err);
    });
  }

  // Returns error if there was an issue, otherwise returns null. Optionally announces error.
  setUpAndValidateProgTag(alertOnError = false, tryWrapping = true): Error {
    try {
      this.initializeProgTag();
      return null;
    }
    catch (err) {
      // @TODO/temp Should be able to remove after people have logged in after Feb 21. Not sure if this is useful for new users trying it out...
      if (tryWrapping) {
        const oldProgFuncString = this.progFuncString;
        this.progFuncString = 'return function(note) {\n' + oldProgFuncString + '\n};';

        const err = this.setUpAndValidateProgTag(alertOnError, false);
        if (! err) {
          this._logger.info('Fixed `progFuncString` by wrapping it in classifier function to return!');
          this.updated(false);
          return null;
        }
        else {
          this.progFuncString = oldProgFuncString;
          return err;
        }
      }

      this._logger.info('Failed to generate smart tag definition', err, err.stack, 'Smart tag definition:', this.progFuncString);

      if (alertOnError) {
        this.dataService.toaster.error(
          'Could not generate smart tag definition. Click for details.',
          'Error running smart tag <span class="static-tag">' + this.name + '</span>',
          {
            timeOut: 10000,
            onclick: () => {
              this.dataService.modalService.generic({
                message:
                  '<h4>Error on smart tag <span class="static-tag">' + this.name + '</span></h4>' +
                  '<pre class="syntax" style="max-height: 30vh">' + _.escape(err.stack || err.toString()) + '</pre>' +
                  '<p>Smart tag definition:</p>' +
                  '<pre class="syntax" style="max-height: 30vh">' + _.escape(this.progFuncString) + '</pre>',
                additionalButtons: [
                  {
                    text: 'Go to smart tag settings',
                    cb: () => {
                      this.goTo('smartness');
                    }
                  }
                ],
              }, true);
            }
          }
        );
      }

      return err;
    }
  }

  initializeProgTag(): void {
    const progTagCreator = new Function('api', '_', this.progFuncString); // (this line excites me)

    // Smart tag should be set up to return the classifier function or prog tag def object, so we call the eval'd function immediately and pass in API and lodash:
    let progTagDef: ProgTagDef = progTagCreator.call(this.publicTag, this.dataService.tags.progTagApi.publicApi, _);

    if (typeof progTagDef === 'function') {
      progTagDef = {
        classifier: progTagDef
      };
    }
    else if (typeof progTagDef !== 'object') {
      throw Error('Smart tag code did not return a classifier function or smart tag definition object');
    }

    if (progTagDef.classifier) {
      this.classifier = this.wrappedProgFunc(progTagDef.classifier);
    }
    else {
      delete this.classifier;
    }

    if (progTagDef.hooks) {
      _.each(progTagDef.hooks, (func, hookName) => {
        if (typeof func !== 'function') {
          throw new Error('Invalid value for "' + hookName + '" - must be a function'); // @TODO/now Test this
        }
        this.hooks[hookName] = this.wrappedProgFunc(func, hookName);
      });
    }
    else {
      this.hooks = {};
    }

    this.customEntries = progTagDef.customEntries || {};
  }

  wrappedProgFunc(func: Function, log = '') {
    if (log) {
      return (note?: Note) => {
        this._logger.log('Calling wrapped function "' + log + '"');
        try {
          return func.call(this.publicTag, note);
        }
        catch (err) {
          this.progTagError(err, note);
        }
      };
    }
    else {
      return (note?: Note) => {
        try {
          return func.call(this.publicTag, note);
        }
        catch (err) {
          this.progTagError(err, note);
        }
      };
    }
  }

  /** This is intended to be run when an otherwise-uncaught error occurs while processing prog tag stuff - e.g. it could occur at any point, like when a note has been updated. */
  progTagError(err: Error, note: Note) {
    this._logger.error('Running programmatic tag on note ID', note.id, 'threw error:', err, err.stack, 'Tag prog function string:', this.progFuncString);

    // @TODO/prog @TODO/now
    this.dataService.toaster.error('Hey there was an unhandled error running smart tags, leave this page up and show Toby please.', {
      preventDuplicates: true,
    });

    // // closeModal may have been just called, so open up new modal in a different tick:
    // $timeout(function() {
    //   $s.m.confirm({
    //     bodyHTML: '<p>There was an error when running your function for tag "' + tag.name  + '":</p><pre>  ' + err + '</pre><p>Would you like to change this tag\'s function or revert to normal tag?</p>',
    //     okText: 'change function',
    //     okCb: function() {
    //       // closeModal may have been just called, so...
    //       $timeout(function() {
    //         $s.t.tagProgSettings(tag);
    //       }, 50);
    //     },
    //     cancelText: 'revert tag',
    //     cancelCb: function() {
    //       tag.prog = false;
    //       $s.t.tagUpdated(tag);
    //     },
    //     large: true,
    //   });
    // }, 50);
  }

  get parentTag(): Tag {
    if (this._parentTag !== undefined) {
      return this._parentTag;
    }

    if (! this.parentTagId) {
      this._parentTag = null;
      return null;
    }

    this._parentTag = this.dataService.tags.tags[this.parentTagId];

    if (! this._parentTag) {
      throw new Error('Child tag ' + this.id + ' could not find parent tag ' + this.parentTagId);
    }

    return this._parentTag;
  }

  /** Returns list of any child tags of ours this note currently has, plus ourselves if the note is tagged with `this` */
  getTagAndChildTagsOnNote(note: Note): Tag[] {
    let tag: Tag;

    return _.reduce(note.tags, (tags: Tag[], tagId: string) => {
      tag = this.dataService.tags.tags[tagId];

      if (tag && (tag === this || tag.parentTag === this)) {
        tags.push(tag);
      }

      return tags;
    }, []);
  }


  /** Navigates to the tag details page for this tag, optionally to a sub-page within it. If a child tag, then it goes to the parent tag's page. */
  goTo(subPage?: 'share' | 'smartness' | 'delete'): void {
    let path: string;

    const tag = this.parentTag || this;

    if (subPage) {
      path = ['', 'tags', 'tag', tag.id, tag.name, subPage].join('/');
    }
    else {
      path = ['', 'tags', 'tag', tag.id, tag.name].join('/');
    }

    // @TODO/polish @TODO/soon We should scroll up the page. I think there's something like this that gets handled in TagDetailsComponent though? Make sure it fires when appropriate.

    this.dataService.router.navigateByUrl(path);
  }

  // @TODO/refactor @TODO/optimization A *much* better option would be to have NoteQueryComponent keep track of tags added/removed and set this value via TagsService.
  queryTagsUpdated(tagsInQuery: Tag[]): void {
    this.isSelfActiveInQuery = false;

    this.isActiveInQuery = !! _.find(tagsInQuery, (tagInQuery) => {
      if (tagInQuery.id === this.id) {
        this.isSelfActiveInQuery = true;
        return true;
      }
      else if (tagInQuery.parentTagId === this.id || tagInQuery.id === this.parentTagId) {
        // If ourselves or a parent or child of ourselves is in the query, we should be highlighted too
        return true;
      }
      else if (tagInQuery.name === (this as any as ChildTag).childTagName) {
        return true;
      }
    });
  }

  goToTaggedNotes(additionalTags: Tag[] = []) {
    let x = this.dataService.activeUIs.noteQuery.goToQuery(
      _.concat([this], additionalTags)
    );
  }

  removeFromNoteQuery() {
    this.dataService.activeUIs.noteQuery.removeTag(this);
  }

  // @TODO/privacy We could exclude private notes and recalculate all lengths when private mode enabled/disabled. Should time running recalculate all on ece's account with gajillion tags
  _calculateNoteCount(): void {
    this._noteCount = this.childInclusiveDocs.length;

    if (this.parentTag) {
      this.parentTag.calculateNoteCount();
    }
  }
  // Generally want to use this debounced version in case many updates (e.g. during prog tag processing) cause this to get called a bunch - `childInclusiveDocs` could be complicated
  calculateNoteCount = _.debounce(this._calculateNoteCount.bind(this), 100);

  /** Returns array of Note instances that have this tag. */
  getNotes(): Note[] {
    return _(this.docs)
      .map((noteId) => this.dataService.notes.notes[noteId])
      .filter((note) => note) // remove falsey notes
      .value();
  }

  /** Returns array of Note instances that have this tag plus Note instances that have any of this tag's child tags. */
  getChildInclusiveNotes(): Note[] {
    return _(this.childInclusiveDocs)
      .map((noteId) => this.dataService.notes.notes[noteId])
      .filter((note) => note) // remove falsey notes
      .value();
  }

  /** Returns array of this tag's ChildTag instances. */
  getChildTags(): ChildTag[] {
    return _.map(
      this.childTagIds,
      (childTagId) => this.dataService.tags.tags[childTagId]
    ) as ChildTag[];
  }

  /** Get all the note IDs of this tag plus the note IDs of any notes tagged by our children. @TODO/optimization This could probably be cached as long as we're careful about when to update it (whenever `update` is called?). */
  get childInclusiveDocs(): string[] {
    if (this.childTagIds.length === 0) {
      return this.docs;
    }

    return _((<Tag[]> this.getChildTags()).concat(this))
      .map((tag) => tag.docs)
      .flatten()
      .uniq()
      .value() as string[]; // not sure why type casting is necessary here...
  }
}
