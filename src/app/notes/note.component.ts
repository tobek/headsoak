import {Inject, forwardRef, Component, EventEmitter, ElementRef, Input, Output, ViewChild, HostBinding, HostListener, Renderer/*, ChangeDetectorRef*/} from '@angular/core';
import {SafeHtml} from '@angular/platform-browser';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {NotesService} from './notes.service';
import {Note} from './note.model';

import {Logger, AutocompleteService, AutocompleteSuggestion, SyntaxService, TooltipService} from '../utils/';

@Component({
  selector: 'note',
  template: require('./note.component.html')
})
export class NoteComponent {
  /** Currently entered text in the "add tag" field */
  addTagName = '';
  /** Whether the "add tag" field is active */
  @HostBinding('class.is--adding-tag') addingTag = false;

  @Input() note: Note;

  // @REMOVED/write
  // @Input() opened = false;
  // @Output() noteOpened = new EventEmitter<Note>();
  // @Output() noteClosed = new EventEmitter<Note>();

  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  /** We want to use `.note` selector to style notes so that we can have a "fake" note using same styles in homepage demo. Set that class here so we don't have to remember to do so whenever using <note>. */
  @HostBinding('class.note') thisIsUnusedAndAlwaysTrue = true;

  @HostBinding('class.is--expanded') isExpanded = false;
  @HostBinding('class.is--focused') isFocused = false;
  // @REMOVED/note text overflow
  // @HostBinding('class.is--text-overflowing') isTextOverflowing = false;
  @HostBinding('class.show--explore') showExplore = false;

  /** Catch any "background" clicks that bubble up to the host element and focus on the body. @NOTE This means that anything in this component that shouldn't lead to body being focused needs `event.stopPropagation`. */
  @HostListener('click') noteClick() {
    this.bodyFocus();
  }

  private removePasteListener: Function;

  private rawDataHtml: SafeHtml;

  private boundCloseAddTagFieldHandler = this.closeAddTagFieldHandler.bind(this);

  private _logger: Logger;

  constructor(
    // public cdrRef: ChangeDetectorRef,
    public el: ElementRef,
    private renderer: Renderer,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private tooltipService: TooltipService,
    private syntaxService: SyntaxService,
    private settings: SettingsService,
    private notesService: NotesService
  ) {}

  ngOnInit() {
    this._logger = new Logger('NoteComponent ' + this.note.id);
  }

  ngAfterViewInit() {
    this.checkTagOverflow();
    // @REMOVED/note text overflow
    // setTimeout(this.checkTextOverflow.bind(this), 0); // otherwise we get expression changing after getting checked...

    this.removePasteListener = this.renderer.listen(
      this.bodyInputRef.nativeElement,
      'paste',
      this.bodyPaste.bind(this)
    );
  }

  ngOnDestroy() {
    this.removePasteListener();
  }
  // ngDoCheck() {
  //   debugger;
  //   this._logger.log('change detection');
  // }

  // @REMOVED/note text overflow
  // checkTextOverflow(): void {
  //   this.isTextOverflowing = this.bodyInputRef.nativeElement.scrollHeight > this.bodyInputRef.nativeElement.clientHeight;
  // }

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

  // @REMOVED/write
  // openNote() {
  //   this.noteOpened.emit(this.note);
  // }
  // closeNote() {
  //   this.noteClosed.emit(this.note);
  // }

  /** Have had some issue with deleted or non-existent tag IDs showing up on notes, here we can debug it. */
  getTagById(tagId: string) {
    // @TODO/optimization This seems to be getting called a BILLION times (more in dev mode but still in prod) though only seeing it when we hit that error of course. Seems to be because of change detection starting from app component. Is that necessary?

    const tag = this.notesService.dataService.tags.tags[tagId];

    if (! tag) {
      if (! this['erroredOnMissingTag' + tagId]) {
        // Logging this message a gajillion times seems to slow down browser, so only do it once
        this._logger.warn('Note ID', this.note.id, 'claims to have tag ID', tagId, 'but no tag found for that ID.');
        this['erroredOnMissingTag' + tagId] = true;
      }
      // @TODO/rewrite @TODO/tags. Check firebase data for all of these and see how pervasive. Permanent fix would be to loop through notes that reference this tag! Once fixed, TagComponent should throw an error rather than try to handle being passed no tag
      return null;
    }

    return tag;
  }

  toggleTag(tagId: string, event: MouseEvent) {
    event.stopPropagation();
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
    this.isFocused = true;
  }

  bodyBlurred() {
    if (this.activeUIs.focusedNoteComponent === this) {
      this.activeUIs.focusedNoteComponent = null;
    }
    this.note.blurred();
    this.isFocused = false;

    // @REMOVED/note text overflow
    // // Wait for max-height transition to finish
    // setTimeout(this.checkTextOverflow.bind(this), 250);
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

  addTagAutocompleteSelect(suggestion: AutocompleteSuggestion, event): void {
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

  newTagClick(event: MouseEvent): void {
    event.stopPropagation();
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

  bodyPaste(event): void {
    const clipboardData = (event.originalEvent || event).clipboardData || window['clipboardData'];
    const text = clipboardData.getData('Text');

    if (document.queryCommandSupported('insertText')) {
      document.execCommand('insertText', false, text);
    }
    else if (document.queryCommandSupported('insertText')) {
      document.execCommand('paste', false, text);
    }
    else {
      this._logger.error('Unexepected lack of support for execCommands `insertText` or `paste` - pasting as normal instead');
      return; 
    }

    // Stop data actually being pasted
    event.stopPropagation();
    event.preventDefault();
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
    if (this.activeUIs.noteBrowser) {
      this.activeUIs.noteBrowser.goToNewNoteWithSameTags(this.note);
    }
  }

  toggleExplore() {
    this.showExplore = ! this.showExplore;

    if (this.showExplore) {
      this.rawDataHtml = this.syntaxService.prettyPrintJson(this.note.forDataStore());
    }

    // @TODO/polish Could have a button to refresh the data if you've since typed stuff?

    // @TODO/now Click out (anywhere except explore or explore button) should close
  }
}
