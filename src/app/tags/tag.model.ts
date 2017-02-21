import {DataService} from '../data.service';

import {Logger} from '../utils/logger';

import {ChildTag} from './';
import {Note} from '../notes/';

import * as _ from 'lodash';
import {each as asyncEach} from 'async';


/** Information this tag generates about a specific note. */
export interface NoteSpecificDatum {
  /** This will be displayed in parentheses after tag name, e.g. `score` might be "50% confidence" and show "nsfw (90% confidence)". @TODO/prog Update component: if no childTag, show score always without hover. */
  score?: any,
  /** Additional stuff can be displayed in the dropdown (unimplemented). */
  more?: string,
}
/** Same as `NoteSpecificDatum` but results in NoteSpecificDatum being attached to a child tag. */
export interface NoteSpecificDatumForChildTag {
  /** Will cause a new ChildTag to be created. Child tag name will be displayed after tag name when shown on this note, e.g. for sentiment analysis tag called "sentiment", `childTag` might be "joy" and be displayed as "sentiment: joy" */
  childTag: string,
  /** This will be displayed in parentheses after tag name on hover, e.g. `score` might be "90% confidence" and show "sentiment: joy (90% confidence)". */
  score?: any,
  more?: string,
}

export type ClassifierResult = boolean | NoteSpecificDatum | NoteSpecificDatumForChildTag | Array<NoteSpecificDatum | NoteSpecificDatumForChildTag>;
export type ClassifierReturnType = ClassifierResult | Promise<ClassifierResult>;

export interface CustomAction {
  icon: string,
  text: string, // in `childTagOnNote` location this is used in the list of tag actions, in `childTagListing` location it's used as tooltip text
  func: Function,
}

export class Tag {
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

  prog?: boolean; // whether it's a programmatic tag
  progFuncString?: string; // string representing programmatic ta@Tg function to be eval'd. This ccould be present even though `prog` is false, saving the function for potential future use.

  private _data: Object = {};
  /** Free-form persistent data store for prog tags to use */
  get data(): Object {
    return this._data || {};
  }
  set data(newData: Object) {
    // @NOTE This might not ever really get called if instead we just set properties on this object instead of re-assigning entire thing. So either a) maybe it should be immutable and smart tag developers will have to accommodate, or b) we need to make sure to tell smart tag developers about changes functions they might want to call when modifying `data`.
    if (! _.isEqual(newData, this._data)) {
      this._data = newData;
      this.prog && this.runProgOnAllNotes();
      this.updated();
    }
  }

  /**
   * Custom actions that prog tags can register, e.g. new stuff in the note tag dropdown.
   *
   * Locations supported so far: just 'childTags' (shows up in list of child tags in TagDetailsComponent, and on child tags on a note)
   *
   * @TODO/prog Document this, e.g. that for both of these `Tag` instance is sent in, and `TagDetailsComponent` is sent in too when in tag details page (that's a big @HACK though so we can update child tags after blacklist, @TODO/soon if tag details could listen for tag updates it could know when to udpate).
   */
  customActions: { [location: string]: CustomAction[] } = {};

  readOnly?: boolean; // @TODO/sharing handle other permissions

  share?: any; // map of recipient (shared-with) user ID to their permissions
  sharedBy?: string; // ID of user that shared this tag
  shareTooltip?: string; // text to identify sharing status to user (e.g. "you are sharing this with ___" or "___ is sharing this with you")

  /** Whether this came from the smart tag library. */
  readonly fromLib?: boolean;

  /** Tag can store specific information on a per-note basis, indexed by note ID. */
  noteData: { [noteId: string]: NoteSpecificDatum } = {};

  childTagIds: string[] = [];

  /** If this note is currently in the process of being deleted. Child tags delete themselves when they've been removed from all notes, deleting a tag also removes the tag from notes, so we need this to prevent infinite loop */
  isDeleting: boolean;


  /** If this is set, this tag corresponds to some specially implemented feature, such as pinned or archived (and, later, private notes). Unless the user selects otherwise in settings, this tag will be hidden from everywhere (autocomplete when adding tag, tag list on notes) except searching and maybe tag browser (probably different section). */
  readonly internal?: boolean;

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


  protected _logger: Logger;

  /** If this is a programmatic tag, this property caches the function that is run to determine if a note should have this tag. */
  private classifier?: (note: Note) => ClassifierReturnType;

  /** Properties that we save to data store */
  static DATA_PROPS = [
    'id',
    'name',
    'created',
    'modified',
    'description',
    'docs',

    'data',
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


  // @TODO how do we handle duplicate names?
  constructor(tagData: any, public dataService: DataService) {
    if (! tagData.id) {
      throw new Error('Must supply tag with id');
    }

    if (tagData.data) {
      // @HACK `data` is actually a setter which updates tag and re-runs programmatic stuff, but if we're just rehydrating a Tag instance then there's no need to do that, so assign it to `_data` instead.
      tagData._data = tagData.data;
      delete tagData.data;
    }

    _.extend(this, tagData);

    this._logger = new Logger('Tag ' + this.id);

    // @TODO/old if `docs` exists, go through and add to each nut?
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

    return true;
  }

  /** Really just a hack for fixing bugs if you add/remove same tag from smart tag library in same session. */
  reset() {
    this._data = {};
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
    this.updated();
  }
  /** @NOTE This does *not* remove ourselves from the note in return. */
  removeNoteId(noteId: string): void {
    this._logger.log('Removing note id', noteId);
    this.docs = _.without(this.docs, '' + noteId);

    if (this.noteData[noteId]) {
      delete this.noteData[noteId];
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
    delete this.classifier; // will be regenerated next time we need it
    this.progFuncString = newFuncString;
  }

  /** See if given note should be tagged by this programmatic tag. */
  runProgOnNote(note: Note, doneCb = (err?) => {}): void {
    if (! this.prog || ! this.progFuncString) {
      this._logger.info('Can\'t run prog tag on note - this tag is not programmatic or has no programmatic function string!', this);
      return doneCb();;
    }

    if (note.new) {
      // Unsaved empty note
      return doneCb();;
    }

    if (! this.classifier) {
      const err = this.setAndValidateClassifier(true);
      if (err) {
        return doneCb(err);
      }
    }

    const result = this.classifier(note);

    if (result instanceof Promise) {
      result.then((result) => {
        this.handleProgResult(note, result);
        doneCb();
      })
      .catch((err) => {
        this.progTagError(err, note);
        doneCb(err);
      });
    }
    else {
      this.handleProgResult(note, result);
      doneCb();
    }
  }

  handleProgResult(note: Note, result: ClassifierResult): void {
    // We need to detect which tags should *no longer* be on this note. We do that by starting here with a list of all the relevant tags on the note. As we handle the classifier result, tags that get added/remain are removed from this list, such that anything left on it at the end should be removed
    const tagsToRemove = this.getTagAndChildTagsOnNote(note);

    if (result === true) {
      // @TODO/prog Check/make clear that it has to be strict boolean true
      this._logger.log('User classifier returned true for note ID', note.id);
      note.addTag(this, true, true);
      _.pull(tagsToRemove, this);
    }
    else if (! (result instanceof Array) && ! (typeof result === 'object')) {
      this._logger.log('User classifier returned false for note ID', note.id);
      // `tagsToRemove` will handle the removal
    }
    else {
      this._logger.log('User classifier returned data for note ID', note.id, result);

      (result instanceof Array ? result : [result]).forEach((noteDatum) => {
        this.handleProgResultDatum(note, noteDatum, tagsToRemove);
      });
    }

    tagsToRemove.forEach((tag) => {
      this._logger.log('User classifier no longer returned anything for tag', tag, '- removing');
      // `note.removeTag` will ultimately call `this.removeNoteId` which will handle `noteData` and child tags as necessary
      note.removeTag(tag, true, true);
    });
  }

  handleProgResultDatum(note: Note, noteDatum: NoteSpecificDatum | NoteSpecificDatumForChildTag, tagsToRemove: Tag[]): void {
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
    return (<NoteSpecificDatumForChildTag>noteDatum).childTag !== undefined;
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

  runProgOnAllNotes(cb = (err?) => {}): void {
    if (! this.prog || ! this.progFuncString) {
      const errMesg = 'Can\'t run prog tag on notes - this tag is not programmatic or has no programmatic function string!';
      this._logger.info(errMesg, this);
      return cb(errMesg);
    }

    this._logger.log('Running smart tag on all notes');
    this._logger.time('Ran smart tag on all notes in');
    console.groupCollapsed();

    asyncEach(this.dataService.notes.notes, this.runProgOnNote.bind(this), (err?) => {
      // @NOTE Since these are potentially async and could take unknown amount of time to complete (maybe they should be time limited?) then other console output could get stuck in here. Not sure what to do! Not that important though since it's just for dev use.
      console.groupEnd();
      this._logger.timeEnd('Ran smart tag on all notes in');
      cb();
    });
  }

  // Returns error if there was an issue, otherwise returns null. Optionally announces error.
  setAndValidateClassifier(alertOnError = false): Error {
    try {
      this.classifier = this.generateClassifier();
      return null;
    }
    catch (err) {
      this._logger.info('Failed to generate classifier', err, err.stack, 'Smart tag definition:', this.progFuncString);

      if (alertOnError) {
        this.dataService.toaster.error(
          'Could not generate classifier. Click for details.',
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

  generateClassifier(): (note: Note) => ClassifierReturnType {
    const smartTagDef = new Function('api', '_', this.progFuncString); // (this line excites me)

    // Smart tag should be set up to return the classifier function, so we call the eval'd function immediately and pass in API and lodash:
    const classifierFunc = smartTagDef.call(this, this.dataService.tags.progTagApi, _);

    if (typeof classifierFunc !== 'function') {
      throw Error('Smart tag code did not return a function');
    }

    // The function we actually call needs to be wrapped in try/catch
    return (note: Note): boolean => {
      try {
        // Passing in this tag as the this arg
        return classifierFunc.call(this, note);
      }
      catch (err) {
        this.progTagError(err, note);
      }
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

  /** ChildTag overrides this, otherwise it's null for non-child tags. */
  parentTagId = null;
  _parentTag: Tag;
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

      if (tag === this || tag.parentTag === this) {
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

    return _((<Tag[]>this.getChildTags()).concat(this))
      .map((tag) => tag.docs)
      .flatten()
      .uniq()
      .value() as string[]; // not sure why type casting is necessary here...
  }
}
