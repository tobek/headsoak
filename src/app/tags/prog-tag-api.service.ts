import {Injectable} from '@angular/core';

import {DataService} from '../';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

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
