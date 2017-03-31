import {Component, Inject, forwardRef} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {ModalService} from '../modals/modal.service';
import {Tag} from './';
import {ProgTagLibraryService} from './prog-tag-library.service';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

import * as _ from 'lodash';

@Component({
  selector: 'prog-tag-library',
  templateUrl: './prog-tag-library.component.html'
})
export class ProgTagLibraryComponent {
  checked = false;
  // private _logger: Logger = new Logger('ProgTagLibraryComponent');

  constructor(
    public progTagLibraryService: ProgTagLibraryService,
    @Inject(forwardRef(() => TagsService)) public tagsService: TagsService,
    private analyticsService: AnalyticsService,
    @Inject(forwardRef(() => ModalService)) private modalService: ModalService
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
  }

  ngAfterViewInit() {
  }

  toggleTag(tag: Tag, event) {
    event.preventDefault();

    this.progTagLibraryService.toggleTag(tag);
  }

  viewCode(tag: Tag) {
    this.modalService.progTagLibTag(tag);
  }

  createSmartTag() {
    this.modalService.prompt('Enter a name for your smart tag:', (name: string) => {
      if (! name) {
        return;
      }

      const newTag = this.tagsService.createTag({ name: name, prog: true }, true);

      newTag.goTo('smartness');
    });
  }
}
