import {Injectable} from '@angular/core';

import {Note, NoteBrowserComponent, NoteComponent} from './notes';

@Injectable()
export class ActiveUIsService {
  public noteBrowser: NoteBrowserComponent;

  /** Note where the textarea currently has focus. */
  public focusedNoteComponent: NoteComponent;

  /** Note which is open in the main writing area. May be the same as focusedNoteComponent. */
  public openNoteComponent: NoteComponent;

  constructor(
  ) {
  }
}
