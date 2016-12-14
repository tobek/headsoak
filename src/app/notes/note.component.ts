import {Inject, forwardRef, Component, EventEmitter, ElementRef, Input, Output, ViewChild, HostBinding/*, ChangeDetectorRef*/} from '@angular/core';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {NotesService} from '../notes/notes.service';
import {Note} from '../notes/note.model';

import {Logger, AutocompleteService, TooltipService} from '../utils/';

@Component({
  selector: 'note',
  template: require('./note.component.html')
})
export class NoteComponent {
  /** Currently entered text in the "add tag" field */
  addTagName = '';
  /** Whether the "add tag" field is active */
  addingTag = false;

  @Input() note: Note;
  @Input() opened = false;
  @Output() noteOpened = new EventEmitter<Note>();
  @Output() noteClosed = new EventEmitter<Note>();
  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  /** We want to use `.note` selector to style notes so that we can have a "fake" note using same styles in homepage demo. Set that class here so we don't have to remember to do so whenever using <note>. */
  @HostBinding('class.note') thisIsUnusedAndAlwaysTrue = true;

  @HostBinding('class.is--expanded') isExpanded = false;

  private boundCloseAddTagFieldHandler = this.closeAddTagFieldHandler.bind(this);

  private _logger = new Logger(this.constructor.name);

  constructor(
    // public cdrRef: ChangeDetectorRef,
    private el: ElementRef,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    // private autocompleteService: AutocompleteService,
    // private tooltipService: TooltipService,
    // private settings: SettingsService,
    @Inject(forwardRef(() => AutocompleteService)) private autocompleteService: AutocompleteService,
    @Inject(forwardRef(() => TooltipService)) private tooltipService: TooltipService,
    @Inject(forwardRef(() => SettingsService)) private settings: SettingsService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
  }

  ngAfterViewInit() {
    this.checkTagOverflow();
  }

  ngOnDestroy() {
  }

  checkTagOverflow(): void {
    if (! this.note) {
      return;
    }

    const tagEls = this.el.nativeElement.querySelectorAll('tag');
    if (tagEls.length > 1 && tagEls[0].offsetTop !== tagEls[tagEls.length - 1].offsetTop) {
      // If the last tag has a different vertical position than the first tag, they must have broken onto separate lines
      // Just using DOM function, seems overkill to trigger change detection up entire ancestor tree (if I understand correctly) very each of potentially hundreds of notes. Or maybe that's exactly the point of Angular?
      this.el.nativeElement.classList.add('has--tag-overflow');
    }
    else {
      this.el.nativeElement.classList.remove('has--tag-overflow');
      this.isExpanded = false;
    }
  }

  openNote() {
    this.noteOpened.emit(this.note);
  }

  closeNote() {
    this.noteClosed.emit(this.note);
  }

  /** Have had some issue with deleted or non-existent tag IDs showing up on notes, here we can debug it. */
  getTagById(tagId: string) {
    // @TODO/optimization This seems to be getting called a BILLION times (more in dev mode but still in prod) though only seeing it when we hit that error of course. Seems to be cause of change detection starting from app component. Is that necessary?

    const tag = this.notesService.dataService.tags.tags[tagId];

    if (! tag) {
      this._logger.error('Note ID', this.note.id, 'claims to have tag ID', tagId, 'but no tag found for that ID.');
      // @TODO/rewrite @TODO/tags. Check firebase data for all of these and see how pervasive. Permanent fix would be to loop through notes that reference this tag! Once fixed, TagComponent should throw an error rather than try to handle being passed no tag
      return null;
    }

    return tag;
  }

  toggleTag(tagId: string, event: MouseEvent) {
    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.tagToggled(tagId, event && event.shiftKey);
    }
  }

  bodyFocus() {
    if (this.bodyInputRef) {
      this.bodyInputRef.nativeElement.focus();
    }
    else {
      setTimeout(() => {
        if (this.bodyInputRef) {
          this.bodyInputRef.nativeElement.focus();
        }
      }, 5);
    }
  }

  bodyFocused() {
    this.activeUIs.focusedNoteComponent = this;
    this.note.focused();
  }

  bodyBlurred() {
    if (this.activeUIs.focusedNoteComponent === this) {
      this.activeUIs.focusedNoteComponent = null;
    }
    this.note.blurred();
  }

  addTagFocused() {
    // We can't rely on blur to close the tag field because then clicking on add tag button also closes tag field.
    window.removeEventListener('click', this.boundCloseAddTagFieldHandler);
    window.addEventListener('click', this.boundCloseAddTagFieldHandler);

    this.addTagSetUpAutocomplete();

    // This still counts as the focused note component - e.g. delete shortcut while in add tag field should still delete the note.
    this.activeUIs.focusedNoteComponent = this;
  }

  addTagSetUpAutocomplete(): void {
    this.autocompleteService.autocompleteTags({
      context: 'note',
      el: this.addTagInputRef.nativeElement,
      excludeTagIds: this.note.tags,
      autocompleteOpts: {
        onSelect: this.addTagAutocompleteSelect.bind(this)
      }
    });
  }

  addTagAutocompleteSelect(suggestion, event): void {
    event.preventDefault();
    event.stopPropagation();

    const defaultAddAnother = ! event.shiftKey && ! event.ctrlKey;

    // @TODO/now Take advantage of autocomplete changes where we have suggestion.data.tag (and, if not, we can assume new tag)
    this.completeAddTag(suggestion.value, defaultAddAnother);
  }

  closeAddTagFieldHandler(event: MouseEvent) {
    const clickedEl = <HTMLElement> event.target;
    if (clickedEl &&
      (clickedEl.classList.contains('new-tag-button') || clickedEl.classList.contains('new-tag-input'))
      ) {
      return;
    }
    else if (document.querySelector('.autocomplete-suggestions').contains(clickedEl)) {
      return;
    }

    this.closeAddTagField();
  }
  
  closeAddTagField(focusOnBody = false) {
    window.removeEventListener('click', this.boundCloseAddTagFieldHandler);
    this.addingTag = false;

    if (this.activeUIs.focusedNoteComponent === this) {
      this.activeUIs.focusedNoteComponent = null;
    }

    if (focusOnBody) {
      this.bodyFocus();
    }
  }

  newTagClick(): void {
    if (! this.addingTag) {
      this.initializeAddTag();
    }
  }
  newTagIconClick(event: MouseEvent): void {
    if (this.addingTag) {
      event.stopPropagation();
      this.completeAddTag();
    }
  }

  initializeAddTag(tagText = this.addTagName, focusOnBody = true): void {
    // @HACK: Not sure why, but using the font-awesome icons inside the add tag button is prevent the addingTag state and/or focus unless we do it in the next tick:
    setTimeout(() => {
      this.addingTag = true;
      this.addTagInputRef.nativeElement.focus();
    }, 0);
  }

  completeAddTag(tagText = this.addTagName, defaultAddAnother = true): void {
    const addAnother = defaultAddAnother ? this.settings.get('addAnotherTag') : ! this.settings.get('addAnotherTag');

    if (tagText === '') {
      this.closeAddTagField(true);
      return;
    }

    const tagAdded = this.note.addTagFromText(tagText);

    if (tagAdded) {
      this.addTagName = '';

      this.closeAddTagField(! addAnother);

      this.checkTagOverflow();
    }

    if (addAnother) {
      setTimeout(() => {
        this.addTagSetUpAutocomplete();
        this.initializeAddTag();
      }, 100);
    }
  }

  removeTag(tagId: string): void {
    this.note.removeTagId(tagId);

    setTimeout(this.checkTagOverflow.bind(this), 0);
  }

  delete(eventOrNoConfirm?: MouseEvent | boolean) {
    if (this.note.new) {
      // Deleting this note doesn't make sense, as it would immediately be replaced with another blank new note.
      return;
    }

    const noConfirm = (eventOrNoConfirm instanceof MouseEvent) ? eventOrNoConfirm.shiftKey : eventOrNoConfirm;

    this.note.delete(noConfirm);
  }

  newNoteWithSameTags() {
    if (this.activeUIs.home) {
      this.activeUIs.home.goToNewNoteWithSameTags(this.note);
    }
  }
}

