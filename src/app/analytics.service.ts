import {Injectable} from '@angular/core';

// @TODO/rewrite we want UserService here but seems to be creating a circular dependency ever since adding autocomplete, so commenting out for now.
// import {UserService} from './account/user.service';

@Injectable()
export class AnalyticsService {
  private ga: any;

  constructor(
    // user: UserService
  ) {
    if (window['ga']) {
      this.ga = window['ga'];
    }

    // GA implementation we're using creates stub `window.ga` as a function that just saves all calls passed to it in, until real GA script loads asynchronously and sends that data in. If the real GA script is blocked (e.g. by ad blocker) then the stub functionality will persist indefinitely, which would be a memory leak. So check if it hasn't loaded by a certain time and just detach it.
    setTimeout(() => {
      if (! this.ga || ! this.ga.loaded) {
        this.ga = null;
      }
    }, 10000);
  }

  event(category: string, action: string, label: string = null, value: number = null) {
    // console.log('Analytics event fired:', arguments);

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
}
