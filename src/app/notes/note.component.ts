import {Inject, forwardRef, Component, EventEmitter, ElementRef, Input, Output, ViewChild, HostBinding, HostListener, Renderer, SimpleChanges/*, ChangeDetectorRef*/} from '@angular/core';
import {DatePipe} from '@angular/common';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {NotesService} from './notes.service';
import {Note} from './note.model';

import {ModalService} from '../modals/modal.service';
import {Logger, AutocompleteService, AutocompleteSuggestion, SizeMonitorService, SyntaxService, TooltipService} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'note',
  templateUrl: './note.component.html'
})
export class NoteComponent {
  /** Currently entered text in the "add tag" field */
  addTagName = '';
  /** Whether the "add tag" field is active */
  @HostBinding('class.is--adding-tag') addingTag = false;

  @Input() note: Note;

  @Input() isOpened = false;
  @Output() noteClosed = new EventEmitter<Note>();

  // @REMOVED/write
  // @Input() opened = false;
  // @Output() noteOpened = new EventEmitter<Note>();

  @ViewChild('bodyInput') bodyInputRef: ElementRef;
  @ViewChild('addTagInput') addTagInputRef: ElementRef;

  /** We want to use `.note` selector to style notes so that we can have a "fake" note using same styles in homepage demo. Set that class here so we don't have to remember to do so whenever using <note>. */
  @HostBinding('class.note') thisIsUnusedAndAlwaysTrue = true;

  @HostBinding('class.is--expanded') hasExpandedTags = false;
  @HostBinding('class.is--focused') isFocused = false;
  @HostBinding('class.is--textless') isTextless = false;
  // @REMOVED/note text overflow
  // @HostBinding('class.is--text-overflowing') isTextOverflowing = false;

  /** Catch any "background" clicks that bubble up to the host element and focus on the body. @NOTE This means that anything in this component that shouldn't lead to body being focused needs `event.stopPropagation`. */
  @HostListener('click') noteClick() {
    this.bodyFocus();
  }

  private removePasteListener: Function;

  private boundCloseAddTagFieldHandler = this.closeAddTagFieldHandler.bind(this);
  private boundCollapseTagsHandler = this.collapseTagsHandler.bind(this);

  private _logger: Logger;

  constructor(
    // public cdrRef: ChangeDetectorRef,
    public el: ElementRef,
    public sizeMonitor: SizeMonitorService,
    public tooltipService: TooltipService,
    public settings: SettingsService,
    private renderer: Renderer,
    private datePipe: DatePipe,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private autocompleteService: AutocompleteService,
    private modalService: ModalService,
    private syntaxService: SyntaxService,
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

  ngOnChanges(changes: SimpleChanges) {
    if (changes['note']) {
      this.checkTextlessness();
    }
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

    // @TODO/polish We could totally find the last note that is on the first line, and absolutely position an ellipsis after it

    const tagEls = this.el.nativeElement.querySelectorAll('tag');
    if (tagEls.length > 1 && tagEls[0].offsetTop !== tagEls[tagEls.length - 1].offsetTop) {
      // If the last tag has a different vertical position than the first tag, they must have broken onto separate lines
      // Just using DOM function, seems overkill to trigger change detection up entire ancestor tree (if I understand correctly) very each of potentially hundreds of notes. Or maybe that's exactly the point of Angular?
      this.el.nativeElement.classList.add('has--tag-overflow');
    }
    else {
      this.el.nativeElement.classList.remove('has--tag-overflow');
      this.hasExpandedTags = false;
    }
  }

  checkTextlessness() {
    if (! this.note) {
      return;
    }

    if (this.isTextless !== ! this.note.body) {
      setTimeout(() => {
        if (this.isTextless !== ! this.note.body) {
          this.isTextless = ! this.note.body;
        }
      }, 0);
    }
  }

  openNote(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      this.tooltipService.closeTooltip(event);
    }

    this.modalService.note(this.note);
  }
  /** Basically just closes it if it's open e.g. in a modal. Otherwise does nothing. */
  unopenNote(event?: MouseEvent) {
    if (event) {
      event.stopPropagation();
      this.tooltipService.closeTooltip(event);
    }

    this.noteClosed.emit(this.note);
  }

  /** `wholeTagClick` refers to whether this click is coming from the <tag> element or from inside the tag actions dropdown. */
  toggleTag(tagId: string, event: MouseEvent, wholeTagClick = false) {
    if (event) {
      event.stopPropagation();
    }

    if (wholeTagClick && this.sizeMonitor.isMobile) {
      // On mobile, click on the whole (unhovered) tag pops up dropdown, and then you have to click inside the dropdown to toggle the tag
      // @TODO/polish What should happen when you click on the tag itself while it *does* have hover dropdown open? Currently nothing. It could, instead, toggle it or close dropdown.
      return;
    }

    this.unopenNote();

    if (this.activeUIs.noteQuery) {
      this.activeUIs.noteQuery.tagToggled(tagId, event && event.shiftKey);
    }
  }

  bodyFocus(attemptNumber = 0) {
    if (! this.bodyInputRef || ! jQuery(this.bodyInputRef.nativeElement).is(':visible')) {
      if (attemptNumber > 20) {
        this._logger.warn('Failed after 2 seconds to try to focus on note body element');
        return;
      }

      setTimeout(() => {
        this.bodyFocus(attemptNumber + 1);
      }, 100);
    }
    else {
      this.bodyInputRef.nativeElement.focus();
    }
  }

  bodyFocused(event: Event) {
    if (this.sizeMonitor.isMobile && ! this.isOpened) {
      this.openNote();

      if (event) {
        event.preventDefault();
      }

      return false;
    }

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

    this.checkTextlessness();

    // @BUG @TODO/polish In Chrome, red squiggly underlines persist after blurring even though `spellcheck` gets set to false, because of this bug: <https://bugs.chromium.org/p/chromium/issues/detail?id=155781>. A fix would be to reassign `innerHTML`, but that a) will be slow for lots of text, b) will lose caret position (lost anyway on blur right now in Chrome), and c) break any references to any elements inside it (of which there are none right now). More discussion: <http://stackoverflow.com/questions/12812348/red-spellcheck-squiggles-remain-in-chrome-after-editing-is-disabled>

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

    if (focusOnBody && ! this.sizeMonitor.isMobile) {
      this.bodyFocus();
    }

    // Clear add tag input
    this.addTagName = '';
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
    // @HACK: Not sure why, but using the font-awesome icons inside the add tag button is prevent the addingTag state and/or focus unless we do it in the next tick: // @HEY Seems like it's no longer needed?
    // setTimeout(() => {
      this.addingTag = true;
      this.addTagInputRef.nativeElement.focus();
    // }, 0);
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

      // @TODO/polish This isn't getting called when a tag is added by other means, e.g. a prog tag. Should fix!
      this.checkTagOverflow();
    }

    if (addAnother && ! this.sizeMonitor.isMobile) {
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

  toggleExpandTags(event: MouseEvent) {
    event.stopPropagation();
    this.tooltipService.reloadOnClick(event);

    this.hasExpandedTags = ! this.hasExpandedTags;

    window.removeEventListener('click', this.boundCollapseTagsHandler);

    if (this.hasExpandedTags) {
      window.addEventListener('click', this.boundCollapseTagsHandler);
    }
  }

  collapseTagsHandler(event: MouseEvent) {
    const clickedEl = <HTMLElement> event.target;
    if (this.el.nativeElement.querySelector('.header').contains(clickedEl)) {
      return;
    }

    this.hasExpandedTags = false;
    window.removeEventListener('click', this.boundCollapseTagsHandler);
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


  toggleArchived(event: MouseEvent) {
    this.note.archived = ! this.note.archived;
    this.tooltipService.reloadOnClick(event);
    event.stopPropagation();

    if (this.note.archived) {
      this.unopenNote();
    }
  }
  togglePinned(event: MouseEvent) {
    this.note.pinned = ! this.note.pinned;
    this.tooltipService.reloadOnClick(event);
    event.stopPropagation();
  }
  togglePrivate(event: MouseEvent) {
    this.note.togglePrivate();
    this.tooltipService.reloadOnClick(event);
    event.stopPropagation();

    if (this.note.private && ! this.notesService.dataService.accountService.privateMode) {
      this.unopenNote(); // @TODO/ece Is this (and same with archiving note) the right behavior?
    }
  }


  delete(eventOrNoConfirm?: MouseEvent | boolean) {
    if (this.note.new) {
      // Deleting this note doesn't make sense, as it would immediately be replaced with another blank new note.
      return;
    }

    let noConfirm;

    if (eventOrNoConfirm instanceof Event) {
      eventOrNoConfirm.stopPropagation();
      this.tooltipService.closeTooltip(eventOrNoConfirm);

      noConfirm = eventOrNoConfirm.shiftKey;
    }
    else {
      noConfirm = eventOrNoConfirm;
    }

    this.note.delete(noConfirm);
  }

  newNoteWithSameTags() {
    if (this.activeUIs.noteBrowser) {
      this.activeUIs.noteBrowser.goToNewNoteWithSameTags(this.note);
    }
  }

  /** @HACK Too lazy to modify ModalComponent template and support passing in a Note intstance through rxjs Subject in ModalService etc... so just ridiculously building the HTML as a string here and passing it in as a generic modal. */
  showExplore(event: MouseEvent) {
    event.stopPropagation();
    this.tooltipService.closeTooltip(event);

    const rawDataHtml = this.syntaxService.prettyPrintJson(this.note.forDataStore());

    let html = '<div class="explore-note">';

      html += '<div class="time-chunk"><h5>Created</h5> ';
        html += this.datePipe.transform(this.note.created, 'medium');
      html += '</div>';
      html += '<div class="time-chunk"><h5>Modified</h5> ';
        html += this.datePipe.transform(this.note.modified, 'medium');
      html += '</div>';

      html += '<h5>Raw data</h5><pre class="syntax">' + rawDataHtml + '</pre>';

    html += '</div>';

    this.modalService.alert(html, true, 'Looks good');
  }
}
