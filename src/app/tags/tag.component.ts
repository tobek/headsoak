import {Component, HostListener, HostBinding, EventEmitter, Input, Output, SimpleChange, ElementRef, ViewChild} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

import {Logger, utils} from '../utils/';

@Component({
  selector: 'tag',
  pipes: [],
  template: require('./tag.component.html')
})
export class TagComponent {
  @Input() tagId: string;
  tag: Tag;

  /** If this is a new tag not yet saved to data store but just created for the user to type new tag name into. */
  isNewTag = false;

  @HostBinding('class.renaming') renaming = false;
  @HostBinding('hidden') hidden = false;

  @ViewChild('tagName') tagNameRef: ElementRef;
  tagNameEl: HTMLInputElement; // Not actually, but contenteditable so it behaves as such

  @Input() renamable: boolean;
  @Input() removable: boolean;
  @Input() showCount: boolean;
  @HostBinding('class.dropdown-enabled') @Input() enableDropdown: boolean;

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

  private hovered = false;
  private hoveredTimeout;

  private _logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {}

  ngOnChanges(changes: {[propName: string]: SimpleChange}) {
    if (changes['tagId'] && changes['tagId'].currentValue !== changes['tagId'].previousValue) {
      this.tagIdUpdated(changes['tagId'].currentValue);
    }
  }

  /** Called after `ngOnChanges`, so that's where we set up this.tag. */
  ngOnInit() {
    this.tagNameEl = this.tagNameRef.nativeElement;
  }

  /** This component is either a) being initialized, or b) being reused for a different tag. */
  tagIdUpdated(newTagId: string): void {
    this.tag = this.tagsService.tags[newTagId];

    if (! this.tag) {
      // throw new Error('Can\'t set up TagComponent: no tag found for tag ID ' + newTagId);
      this._logger.error('Can\'t set up TagComponent: no tag found for tag ID', newTagId + '. Hiding component.');
      // @TODO/rewrite @TODO/tags. Check firebase data for all of these and see how pervasive. Permanent fix would be to loop through notes that reference this tag!
      this.tag = <Tag> {};
      this.hidden = true;
    }

    if (! this.tag.name) {
      this.isNewTag = true;
      this.renamable = false;
    }
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
