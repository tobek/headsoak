import {Component, HostListener, HostBinding, EventEmitter, Input, Output, SimpleChange, ElementRef, ViewChild} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

import {Logger, utils} from '../utils/';

@Component({
  selector: 'tag',
  template: require('./tag.component.html')
})
export class TagComponent {
  @Input() tag: Tag;

  /** Optional, supplied if this tag component is being shown on a specific note. */
  @Input() ofNoteId?: string;

  /** If this is a new tag not yet saved to data store but just created for the user to type new tag name into. */
  isNewTag = false;

  @HostBinding('class.renaming') renaming = false;
  @HostBinding('hidden') hidden = false;

  @ViewChild('tagName') tagNameRef: ElementRef;
  tagNameEl: HTMLInputElement; // Not actually, but contenteditable so it behaves as such

  @Input() renamable: boolean;
  @Input() inlineRemovable: boolean;
  @Input() showCount: boolean;
  @HostBinding('class.dropdown-enabled') @Input() enableDropdown: boolean;

  @HostBinding('class.hovered') hovered = false;

  @Output() removed = new EventEmitter<Tag>(); // removed from given context (e.g. note, search query)
  @Output() deleted = new EventEmitter<Tag>(); // deleted entirely

  @HostListener('mouseover') onMouseover(btn) {
    if (! this.hoveredTimeout) {
      this.hoveredTimeout = setTimeout(() => {
        this.hovered = true;
        this.hoveredTimeout = null;
      }, 250);
    }
  }
  @HostListener('mouseleave') onMouseleave(btn) {
    if (this.hoveredTimeout) {
      clearTimeout(this.hoveredTimeout);
      this.hoveredTimeout = null;
    }
    this.hovered = false;
  }

  private hoveredTimeout;

  private _logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {}

  ngOnInit() {
    if (! this.tag) {
      // throw new Error('Can\'t set up TagComponent: value passed as @Input `tag` was falsey.');
      this._logger.error('Can\'t set up TagComponent: value passed as @Input `tag` was falsey. Hiding component.');
      // 
      this.tag = <Tag> {};
      this.hidden = true;
      return;
    }

    if (! this.tag.name) {
      this.isNewTag = true;
      this.renamable = false;
    }

    this.tagNameEl = this.tagNameRef.nativeElement;
  }

  remove() {
    this.removed.emit(this.tag);
  }

  renameStart() {
    this.renaming = true; // makes name element contenteditable
    setTimeout(() => {
      utils.placeCaretAtEnd(this.tagNameEl);
    }, 0);
  }
  renameFinish(event: KeyboardEvent) {
    event.preventDefault();

    const newName = this.tagNameEl.innerHTML.trim();

    if (! newName) {
      this.renameCancel();
      return;
    }

    this.renaming = false;
    this.tag.rename(newName);

    if (this.isNewTag) {
      this.isNewTag = false;
      this.renamable = true;
    }
  }
  renameCancel() {
    this.renaming = false;

    if (this.isNewTag) {
      this.delete(true);
    }
    else {
      this.tagNameEl.innerHTML = this.tag.name;
    }
  }

  delete(noConfirm = false) {
    if (this.tag.delete(noConfirm)) {
      this.deleted.emit(this.tag);
    }
  }

}
