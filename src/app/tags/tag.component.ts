import {Component, HostListener, HostBinding, EventEmitter, Input, Output, ElementRef, ViewChild} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

import {utils} from '../utils/';

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

  @ViewChild('tagName') tagNameRef: ElementRef;
  tagNameEl: HTMLInputElement; // Not actually, but contenteditable so it behaves as such

  @Input() renamable: boolean;
  @Input() removable: boolean;
  @Input() showCount: boolean;
  @HostBinding('class.dropdown-enabled') @Input() enableDropdown: boolean;

  @Output() removed = new EventEmitter<Tag>(); // removed from given context (e.g. note, search query)
  @Output() deleted = new EventEmitter<Tag>(); // deleted entirely

  @HostListener('mouseover') onMouseover(btn) {
    this.hovered = true;
  }
  @HostListener('mouseleave') onMouseleave(btn) {
    this.hovered = false;
  }

  private hovered = false;

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {}

  ngOnInit() {
    this.tag = this.tagsService.tags[this.tagId];

    if (! this.tag) {
      throw new Error('Can\'t initialize TagComponent: no tag found for tag ID ' + this.tagId);
    }
    this.tagNameEl = this.tagNameRef.nativeElement;

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
