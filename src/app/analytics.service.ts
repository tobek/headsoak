import {Injectable} from 'angular2/core';

import {AccountService} from './account';

@Injectable()
export class AnalyticsService {
  private ga: Function;

  constructor(private accountService: AccountService) {
    if (window['ga']) {
      this.ga = window['ga'];
    }
  }

  event(category: string, action: string, label: string = null, value: number = null) {
    this.ga('send', {
      hitType: 'event',
      eventCategory: category,
      eventAction: action,
      eventLabel: label,
      eventValue: value,
    });
  }
}
