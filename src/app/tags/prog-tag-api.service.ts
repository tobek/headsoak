import {Injectable, Inject, forwardRef} from '@angular/core';
import {DatePipe} from '@angular/common';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';
import {UserService} from '../account/user.service';

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
  tags: { [tagId: string]: Tag } = {};
  notes: { [noteId: string]: Note } = {};
  user: UserService;

  formatDate: (timestamp: number, format?: string) => string;

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
    @Inject(forwardRef(() => ModalService)) public modal: ModalService,
    datePipe: DatePipe
  ) {
    this.formatDate = datePipe.transform.bind(datePipe)
  }

  // @TODO/polish This won't actually send an email until the nearest hour when server cron runs. We could have a separate Firebase location for immediate emails that the server watcher could listen to instead.
  sendUserEmail(
    email: { subject: string, bodyTemplate: string, tagId: string, noteId?: string, },
    cb?: (err?) => {}
  ): string {
    if (! email || ! email.subject || typeof email.bodyTemplate === 'undefined' || ! email.tagId) {
      throw new Error('Failed to supply required arguments. Must supply an "email" object with "subject", "bodyTemplate", and "tagId" properties.');
    }

    return this.queueUserEmail(Date.now(), email, cb);
  }

  /** If your email needs to use the contents of a note, and you'd like your email to reflect the note at the time the email is *sent* as opposed to the time you queue the email, you must access the note through lodash template syntax. This way, at the time the email is to be sent, Headsoak servers will fetch the current version of the note and feed it into the template. Also: all string properties of tags and notes are HTML-escaped (by `_.escape`) before being passed to the template. */
  queueUserEmail(
    sendAt: number, // in ms
    email: { subject: string, bodyTemplate: string, tagId: string, noteId?: string, },
    cb?: (err?) => {}
  ): string {
    if (! sendAt || ! email || ! email.subject || typeof email.bodyTemplate === 'undefined' || ! email.tagId) {
      throw new Error('Failed to supply required arguments. Must supply: "sendAt" timestamp and an "email" object with "subject", "bodyTemplate", and "tagId" properties.');
    }
    const localId = Math.floor((Date.now() + Math.random()) * 100).toString(36);
    const globalId = _dataService.user.uid + ':' + localId;

    _dataService.ref.root().child('queuedEmails/' + globalId).set({
      uid: _dataService.user.uid,
      type: 'prog',
      sendAt: Math.round(sendAt / 1000),
      subject: email.subject,
      template: email.bodyTemplate,
      tagId: email.tagId,
      noteId: email.noteId || null,
    }, (err?) => {
      err && this._logger.warn('Failed to queue email for user', _dataService.user.uid, 'with email id', globalId, ' - error:', err);

      cb && cb(err);
    });

    return localId;
  }

  // @TODO/polish @TODO/prog @TODO/account Delete all user's queued emails when user deletes account
  cancelQueuedEmail(id: string, cb?: (err?) => {}) {
    if (! id) {
      throw new Error('Must supply "id" parameter');
    }
    const actualId = _dataService.user.uid + ':' + id;

    _dataService.ref.root().child('queuedEmails/' + actualId).remove((err?) => {
      err && this._logger.warn('Failed to cancel queued email for user', _dataService.user.uid, 'with email id', actualId, ' - error:', err);

      cb && cb(err);
    });
  }

  _init(dataService: DataService): void {
    _dataService = dataService;
    this.tags = dataService.tags.tags;
    this.notes = dataService.notes.notes;
    this.user = dataService.user.getPublicUser() as UserService;
  }
}
