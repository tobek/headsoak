import {Injectable} from '@angular/core';

import {NoteBrowserComponent} from './notes';

@Injectable()
export class ActiveUIsService {
  public noteBrowser: NoteBrowserComponent;

  constructor(
  ) {
  }
}
