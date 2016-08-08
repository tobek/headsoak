import {Component, EventEmitter, Input, Output, ElementRef, ViewChild} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './tag.model';
import {TagsService} from './tags.service';

import {utils} from '../utils/';

@Component({
  selector: 'tag',
  pipes: [],
  styles: [ require('./tag.component.css') ],
  template: require('./tag.component.html')
})
export class TagComponent {
  @Input() tagId: string;
  tag: Tag;

  renaming = false;

  @ViewChild('tagName') tagNameRef: ElementRef;
  tagNameEl: HTMLInputElement; // Not actually, but contenteditable so it behaves as such

  @Input() editable: boolean;
  @Input() removable: boolean;
  @Input() showCount: boolean;

  @Output() removed = new EventEmitter<Tag>(); // removed from given context (e.g. note, search query)
  @Output() deleted= new EventEmitter<Tag>(); // deleted entirely

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService
  ) {}

  ngOnInit() {
    this.tag = this.tagsService.tags[this.tagId];
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
    this.renaming = false;
    this.tag.rename(this.tagNameEl.innerHTML.trim());
  }
  renameCancel() {
    this.renaming = false;
    this.tagNameEl.innerHTML = this.tag.name;
  }

  delete(event: MouseEvent) {
    let noConfirm = event.shiftKey;
    if (this.tag.delete(noConfirm)) {
      this.deleted.emit(this.tag);
    }
  }

}
