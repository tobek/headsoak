import {Injectable, Inject, forwardRef} from '@angular/core';
import {DatePipe} from '@angular/common';

import {DataService} from '../data.service';
import {ModalService} from '../modals/modal.service';

import {Tag} from './tag.model';
import {Note} from '../notes/note.model';
import {UserService} from '../account/user.service';

import {Logger, utils} from '../utils/';

import {GeniusFunction, GeniusRequest, GeniusResponse, GeniusResponseMessage} from '../../worker/genius';

import * as _ from 'lodash';

// This is a tiny library so not worth putting in the worker, and it's convenient to use synchronously.
import * as nlcstToString from 'nlcst-to-string';

// Defining these out here so that the returned ProgTagApiService give to users won't have direct access to them (@TODO/prog They will be able to access data service via `tags` and `notes` but those should be hidden behind public versions in the future)
let _dataService: DataService;
let _worker: Worker;
const _requests: { [id: number]: { resolve: Function, reject: Function } } = {};

/** Service passed in to user-generated smart/programmatic tags so that they can interact with their data and the rest of the application. */
@Injectable()
export class ProgTagApiService {
  tags: { [tagId: string]: Tag } = {};
  notes: { [noteId: string]: Note } = {};
  user: UserService;

  formatDate: (timestamp: number, format?: string) => string;

  lib = {
    nlcstToString: nlcstToString,
    sentiment: (text: string): Promise<any> => {
      return this.callWorkerFunction('sentiment', [text]);
    },
    keywords: (text: string): Promise<any> => {
      return this.callWorkerFunction('keywords', [text]);
    },
    profanities: (text: string): Promise<any> => {
      return this.callWorkerFunction('profanities', [text]);
    },
  };

  private _dataService: DataService;

  private _logger = new Logger('ProgTagApiService');

  constructor(
    @Inject(forwardRef(() => ModalService)) public modal: ModalService,
    datePipe: DatePipe
  ) {
    this.formatDate = datePipe.transform.bind(datePipe);

    this.initializeGeniusWorker();

    this.lib.keywords('Star Wars is a sci fi opera').then((result) => {
      this._logger.log('Worker returned keywords:', result);
    });
  }

  initializeGeniusWorker() {
    if (! window['Worker']) {
      throw new Error('Web worker not available!');
    }

    this._logger.log('Starting genius worker...');

    // Webpack automagically picks this up and creates a bundle based on genius.ts, naming it with a hash for caching (e.g. `2e9912589ce947ab1cf5.worker.js`), and then this script loads that script using the normal `window.Worker` class.
    const GeniusWorker = require('worker-loader?name=genius.[hash].js!../../worker/genius.ts');
    _worker = new GeniusWorker();

    _worker.onmessage = (mesg: GeniusResponseMessage) => {
      this.onWorkerResponse(mesg.data);
    };

    _worker.onerror = (e) => {
      e.preventDefault(); // This prevents normal logging of thrown error from within the worker (but execution is still stopped at the throw as normal)
      this._logger.error('Genius worker threw uncaught error', {
        message: e.message, filename: e.filename, lineno: e.lineno
      });
    };
  }

  /** We store the callback by a randomly generated ID, and pass that same ID to the worker. When the worker posts a message back to us, we can retrieve the callback by that ID and call it with the result. */
  callWorkerFunction(fn: GeniusFunction, args: any[]): Promise<any> {
    const id = utils.sessionRandomId();

    return new Promise((resolve, reject) => {
      _requests[id] = { resolve: resolve, reject: reject };

      this.postWorkerRequest({
        id: id,
        fn: fn,
        args: args,
      });
    });

    // @TODO/polish Should we check the size of `_requests`? If it gets HUGE then it could be sign of a problem, e.g. worker isn't resolving any requests. However, it's not clear what number to test against. If a user has 1,000 notes it's perfectly conceivable to have 1,000 requests queued up. So do we check if there are more than 10,000 requests queued up? Even with 1,000 notes it's unlikely to reach that high. We could instead check timestamps, and warn on old, unanswered requests, but that's even more overhead... anyways.
  }

  onWorkerResponse(res: GeniusResponse) {
    // this._logger.log('Received response from worker:', res);

    if (res.err) {
      this._logger.warn('Genius worker returned error:', res.err);
      _requests[res.id].reject(res.err);
    }
    else {
      _requests[res.id].resolve(res.result);
    }

    delete _requests[res.id];
  }

  postWorkerRequest(req: GeniusRequest) {
    _worker.postMessage(req);
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
    const localId = utils.randomId();
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
