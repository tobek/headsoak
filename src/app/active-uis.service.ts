import {Injectable} from '@angular/core';

import {NoteBrowserComponent, NoteComponent} from './notes';

@Injectable()
export class ActiveUIsService {
  public noteBrowser: NoteBrowserComponent;
  public noteComponent: NoteComponent;

  constructor(
  ) {
  }
}
