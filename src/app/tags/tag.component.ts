import {Component, HostListener, HostBinding, EventEmitter, Input, Output, ElementRef, ViewChild} from '@angular/core';
import {Subscription} from 'rxjs';

import {AnalyticsService} from '../analytics.service';
import {ActiveUIsService} from '../active-uis.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

import {Logger, utils} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'tag',
  template: require('./tag.component.html')
})
export class TagComponent {
  INTERNAL_TAG_DATA = Tag.INTERNAL_TAG_DATA // expose to template
  
  @Input() tag: Tag;

  /** Optional, supplied if this tag component is being shown on a specific note. */
  @Input() ofNoteId?: string;

  @Input() context?: 'note' | 'noteQuery' | 'tagBrowser';

  /** If this is a new tag not yet saved to data store but just created for the user to type new tag name into. */
  isNewTag = false;

  /** Whether this should have active state, e.g. note is in the note query search bar is enabled in smart tag library */
  @Input() @HostBinding('class.is--active') isActive;

  @HostBinding('class.renaming') renaming = false;
  @HostBinding('hidden') hidden = false;

  @ViewChild('tagName') tagNameRef: ElementRef;
  tagNameEl: HTMLInputElement; // Not actually, but contenteditable so it behaves as such

  @Input() renamable?: boolean;
  @Input() renamableOnNameClick?: boolean;
  @Input() inlineRemovable?: boolean;
  @Input() showCount?: boolean;
  @HostBinding('class.dropdown-enabled') @Input() enableDropdown?: boolean;
  @HostBinding('class.dropdown-disabled') disableDropdown = true;

  @HostBinding('class.hovered') hovered = false;

  @Output() removed = new EventEmitter<Tag>(); // removed from given context (e.g. note, search query)
  @Output() deleted = new EventEmitter<Tag>(); // deleted entirely
  @Output() renamingOver = new EventEmitter<void>(); // renaming completed or canceled

  @HostListener('mouseover') onMouseover() {
    if (this.ofNoteId) {
      // Wait a moment before showing dropdown or else they go flying willy-nilly as you mousearound the notes
      if (! this.hoveredTimeout) {
        this.hoveredTimeout = setTimeout(() => {
          this.hovered = true;
          this.hoveredTimeout = null;
        }, 250);
      }
    }
    else {
      if (! this.renaming) {
        this.hovered = true;
      }
      // if renaming, showing active chiclet on hover is annoying
    }
  }
  @HostListener('mouseleave') onMouseleave() {
    if (this.hoveredTimeout) {
      clearTimeout(this.hoveredTimeout);
      this.hoveredTimeout = null;
    }
    this.hovered = false;
  }

  private hoveredTimeout;

  private queryTagsUpdatedSub: Subscription;

  private _logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private activeUIs: ActiveUIsService,
    private tagsService: TagsService
  ) {}

  ngOnInit() {
    if (! this.tag) {
      // throw new Error('Can\'t set up TagComponent: value passed as @Input `tag` was falsey.');
      this._logger.error('Can\'t set up TagComponent: value passed as @Input `tag` was falsey. Hiding component.');

      this.tag = <Tag> {};
      this.hidden = true;
      return;
    }

    if (! this.tag.name) {
      this.isNewTag = true;
      this.renamable = false;
    }

    this.tagNameEl = this.tagNameRef.nativeElement;

    if (this.ofNoteId || this.context === 'tagBrowser') {
      this.queryTagsUpdatedSub = this.activeUIs.noteQuery.tagsUpdated$.subscribe(
        this.queryTagsUpdated.bind(this)
      );

      // And run it once at first to get us started:

      this.queryTagsUpdated(this.activeUIs.noteQuery.tags);
    }

    this.disableDropdown = ! this.enableDropdown;
  }

  ngOnDestroy() {
    if (this.queryTagsUpdatedSub) {
      this.queryTagsUpdatedSub.unsubscribe();
    }
  }

  queryTagsUpdated(tags: Tag[]): void {
    // @TODO/tags/subtags @HACK Since on notes we show Tag instances but sort of hack to show subtag stuff if relevant, but in note query we can get actual SubTag instances, we need to check base tag ID.
    this.isActive = !! _.find(tags, (tag) => tag.baseTagId === this.tag.id);
  }

  remove() {
    this.removed.emit(this.tag);
  }

  // @TODO/polish If you get here by clicking on .name-wrapper, it would be cool if the cursor position was set properly!
  renameStart(event?: Event) {
    if (event) {
      event.stopPropagation();
    }

    this.renaming = true; // makes name element contenteditable
    setTimeout(() => {
      utils.placeCaretAtEnd(this.tagNameEl);
    }, 0);
  }
  renameFinish(event?: KeyboardEvent) {
    if (! this.renaming) {
      return;
    }

    if (event) {
      event.preventDefault();
    }

    const newName = this.tagNameEl.innerHTML.trim();

    if (! newName || newName === this.tag.name) {
      this.renameCancel();
      return;
    }

    this.renaming = false;
    this.tag.rename(newName);

    if (this.isNewTag) {
      this.isNewTag = false;
    }

    this.renamingOver.emit();
  }
  renameCancel() {
    this.renaming = false;

    if (this.isNewTag) {
      this.delete(true);
    }
    else {
      this.tagNameEl.innerHTML = this.tag.name;
    }

    this.renamingOver.emit();
  }
  /** We may have blurred because they clicked on the checkmark to finish renaming, so wait a moment before cancelling to see if they did that. */
  renameBlur() {
    setTimeout(() => {
      if (this.renaming) {
        this.renameCancel();
      }
    }, 50);
  }

  delete(noConfirm = false) {
    if (this.tag.delete(noConfirm)) {
      this.deleted.emit(this.tag);
    }
  }

}
