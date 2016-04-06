import {
  it,
  inject,
  injectAsync,
  beforeEach,
  beforeEachProviders,
} from 'angular2/testing';
import {provide} from 'angular2/core';

import {AnalyticsService} from './analytics.service';
import {AccountService} from './account';

describe('AnalyticsService', () => {
  class AccountServiceMock {
      uid: string = 'abcd';
  }

  var analyticsService;
  beforeEachProviders(() => [
    AnalyticsService,
    provide(AccountService, { useClass: AccountServiceMock }),
  ]);

  beforeEach(inject([ AnalyticsService ], (injectedService) => {
    analyticsService = injectedService;
    analyticsService.ga = () => {};
  }));

  it('should call Google Analytics when tracking an event', () => {
    spyOn(analyticsService, 'ga');

    analyticsService.event('category', 'action');

    expect(analyticsService.ga).toHaveBeenCalled();
  });

});
