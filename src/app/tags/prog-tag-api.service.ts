import {Injectable} from '@angular/core';

import {DataService} from '../data.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

import * as _ from 'lodash';

import * as sentiment from 'sentiment';
import * as nlcstToString from 'nlcst-to-string';
import * as retext from 'retext';
import * as retextKeywords from 'retext-keywords';

@Injectable()
export class ProgTagApiService {
  tags: { [tagId: string]: Tag } = {}; // id -> Tag instance
  notes: { [noteId: string]: Note } = {}; // id -> Note instance

  lib = {
    sentiment: sentiment,
    nlcstToString: nlcstToString,
    retext: retext,
    retextKeywords: retextKeywords,
  };

  constructor() {
  }

  init(dataService: DataService): void {
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
  }
}
