import {Injectable, Inject, forwardRef} from '@angular/core';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';

import {Logger} from '../utils/';

import * as _ from 'lodash';

import * as sentiment from 'sentiment';
import * as nlcstToString from 'nlcst-to-string';
import * as retext from 'retext';
import * as retextKeywords from 'retext-keywords';
import * as retextProfanities from 'retext-profanities';

// Defining this out here so that the returned ProgTagApiService give to users won't have direct access to it (@TODO/prog They will via `tags` and `notes` but those should be hidden behind public versions in the future)
let _dataService: DataService;

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

  private _dataService: DataService;

  private _logger = new Logger('ProgTagApiService');

  constructor(
    @Inject(forwardRef(() => ModalService)) public modal: ModalService // @TODO/prog Add to documentation
  ) {
  }

  // @TODO/polish This won't actually send an email until the nearest hour when server cron runs. We could have a separate Firebase location for immediate emails that the server watcher could listen to instead.
  sendUserEmail(
    id: string,
    email: { subject: string, bodyTemplate: string, tagId: string, noteId?: string, },
    cb?: (err?) => {}
  ) {
    if (! id || ! email || ! email.subject || typeof email.bodyTemplate === 'undefined' || ! email.tagId) {
      throw new Error('Failed to supply required arguments. Must supply: "id", and an "email" object with "subject", "bodyTemplate", and "tagId" properties.');
    }

    this.queueUserEmail(id, Date.now(), email, cb);
  }

  queueUserEmail(
    id: string,
    when: number,
    email: { subject: string, bodyTemplate: string, tagId: string, noteId?: string, },
    cb?: (err?) => {}
  ) {
    if (! id || ! when || ! email || ! email.subject || typeof email.bodyTemplate === 'undefined' || ! email.tagId) {
      throw new Error('Failed to supply required arguments. Must supply: "id", "when", and an "email" object with "subject", "bodyTemplate", and "tagId" properties.');
    }
    const actualId = _dataService.user.uid + ':' + id;

    _dataService.ref.root().child('queuedEmails/' + actualId).update({
      uid: _dataService.user.uid,
      type: 'prog',
      when: when,
      subject: email.subject,
      template: email.bodyTemplate,
      tagId: email.tagId,
      noteId: email.noteId || null,
    }, (err?) => {
      err && this._logger.warn('Failed to queue email for user', _dataService.user.uid, 'with email id', id, ' - error:', err);

      cb && cb(err);
    });
  }

  _init(dataService: DataService): void {
    _dataService = dataService;
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
  }
}
