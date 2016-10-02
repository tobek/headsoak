import {Injectable} from '@angular/core';

import {DataService} from '../';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

@Injectable()
export class ProgTagApiService {
  tags: { [key: string]: Tag } = {}; // id -> Tag instance
  notes: { [key: string]: Note } = {}; // id -> Note instance

  constructor() {
  }

  init(dataService: DataService): void {
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
  }
}
