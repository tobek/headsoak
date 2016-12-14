import {Injectable} from '@angular/core';

import {DataService} from '../data.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

import * as _ from 'lodash';

const sentiment = require('sentiment');

@Injectable()
export class ProgTagApiService {
  tags: { [key: string]: Tag } = {}; // id -> Tag instance
  notes: { [key: string]: Note } = {}; // id -> Note instance

  lib = {
    sentiment: sentiment,
  };

  constructor() {
  }

  init(dataService: DataService): void {
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
  }
}
