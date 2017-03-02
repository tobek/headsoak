import {Injectable, Inject, forwardRef} from '@angular/core';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

import * as _ from 'lodash';

import * as sentiment from 'sentiment';
import * as nlcstToString from 'nlcst-to-string';
import * as retext from 'retext';
import * as retextKeywords from 'retext-keywords';
import * as retextProfanities from 'retext-profanities';

@Injectable()
export class ProgTagApiService {
  tags: { [tagId: string]: Tag } = {}; // id -> Tag instance
  notes: { [noteId: string]: Note } = {}; // id -> Note instance

  lib = {
    sentiment: sentiment,
    nlcstToString: nlcstToString,
    retext: retext,
    retextKeywords: retextKeywords,
    retextProfanities: retextProfanities,
  };

  constructor(
    @Inject(forwardRef(() => ModalService)) public modal: ModalService // @TODO/prog Add to documentation
  ) {
  }

  _init(dataService: DataService): void {
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
  }
}
