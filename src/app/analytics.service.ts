import {Injectable} from '@angular/core';
import {Router} from '@angular/router';

import * as jQuery from 'jquery';

import {Logger} from './utils/';

import {UserService} from './account/user.service';

// @TODO/refactor These two interfaces are basically used by joi in the analytics server, would be great to import from here!
interface AnalyticsEvent {
  category: string;
  action: string;
  timestamp: number;
  time_since: number;
  session_id: number;

  uid?: string;
  label?: string;
  value?: number;
  route?: string;
}
interface AnalyticsSession {
  timestamp: number;
  timezone: string;
  viewport_x: number;
  viewport_y: number;
  referrer: string;
}

@Injectable()
export class AnalyticsService {
  private sessionId: number;

  private eventQueue: AnalyticsEvent[] = [];

  private ga: any;

  private _logger: Logger = new Logger('AnalyticsService');

  constructor(
    private router: Router,
    private user: UserService
  ) {
    this.initSession();

    if (window['ga']) {
      this.ga = window['ga'];
    }

    // GA implementation we're using creates stub `window.ga` as a function that just saves all calls passed to it in, until real GA script loads asynchronously and sends that data in. If the real GA script is blocked (e.g. by ad blocker) then the stub functionality will persist indefinitely, which would be a memory leak. So check if it hasn't loaded by a certain time and just detach it.
    setTimeout(() => {
      if (! this.ga || ! this.ga.loaded) {
        this.ga = null;
      }
    }, 10000);

    window['hsEvent'] = this.event.bind(this); // @HACK
  }

  event(category: string, action: string, label: string = undefined, value: number = undefined) {
    if (ENV !== 'production') {
      return;
    }

    const eventData: AnalyticsEvent = {
      session_id: this.sessionId,
      timestamp: Date.now(),
      time_since: performance.now() - (window['hsLoginTime'] || 0), // @HACK See comment in `utils/logger`
      uid: this.user.uid,
      route: this.router.url,

      category: category,
      action: action,
      label: label,
      value: value,
    };

    // this._logger.log('Firing analytics event', eventData);

    this.postEvent(eventData);

    if (this.ga) {
      this.ga('send', {
        hitType: 'event',
        eventCategory: category,
        eventAction: action,
        eventLabel: label,
        eventValue: value,
      });
    }
  }

  postEvent(eventData: AnalyticsEvent) {
    if (! this.sessionId) {
      this.eventQueue.push(eventData);
      return;
    }

    if (! eventData.session_id) {
      // Event may have been queued before we had a session ID
      eventData.session_id = this.sessionId;
    }

    jQuery.ajax({
      method: 'POST',
      url: 'https://brain.headsoak.com/axon',
      data: eventData,
      error: (jqXhr: JQueryXHR, textStatus: string, errString: string) => {
        this.analyticsPostError('Error POSTing event:', textStatus, errString);
      },
    });
  }

  initSession() {
    if (ENV !== 'production') {
      return;
    }

    const sessionData: AnalyticsSession = {
      timestamp: Date.now(),

      /**
       * @TODO/analytics `timezone` here just gets UTC offset, which varies with UTC, and doesn't properly identify timezone. Other options:
       *
       * - `(new Date().toTimeString()` and try to parse it... but it's implementation dependent. could be e.g. `"20:49:57 GMT-0400 (EDT)"`
       * - <http://stackoverflow.com/a/2853535/458614>
       * - <https://bitbucket.org/pellepim/jstimezonedetect/wiki/Home>
       */
      timezone: '' + -(new Date().getTimezoneOffset() / 60),
      viewport_x: document.documentElement.clientWidth,
      viewport_y: document.documentElement.clientHeight,
      referrer: document.referrer || undefined,
    };

    jQuery.ajax({
      method: 'POST',
      url: 'https://brain.headsoak.com/neurogenesis',
      data: sessionData,
      success: (data: any) => {
        if (! data.session_id) {
          this.analyticsPostError('No sesion_id in response!');
          return;
        }

        this.sessionInitialized(data.session_id, sessionData);
      },
      error: (jqXhr: JQueryXHR, textStatus: string, errString: string) => {
        this.analyticsPostError('Error POSTing session:', textStatus, errString);
      },
    });
  }

  sessionInitialized(sessionId: number, sessionData: AnalyticsSession) {
    // this._logger.log('Session initialized with ID', sessionId, sessionData);

    this.sessionId = sessionId;

    this.eventQueue.forEach(this.postEvent.bind(this));
    this.eventQueue = [];
  }

  analyticsPostError(logMessage: string, textStatus?: string, errString?: string) {
    this._logger.warn(logMessage, textStatus, errString);
  }
}
