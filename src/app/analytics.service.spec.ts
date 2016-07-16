import {
  it,
  inject,
  beforeEach,
  beforeEachProviders,
} from '@angular/core/testing';
import {provide} from '@angular/core';

import {AnalyticsService} from './analytics.service';
import {UserService, AccountService} from './account';

describe('AnalyticsService', () => {
  class AccountServiceMock {
      uid: string = 'abcd';
  }

  var analyticsService;
  beforeEachProviders(() => [
    AnalyticsService,
    UserService,
    provide(AccountService, { useClass: AccountServiceMock }),
  ]);

  beforeEach(inject([ AnalyticsService ], (injectedService) => {
    analyticsService = injectedService;
    analyticsService.ga = () => {};
    analyticsService.ga.loaded = true;
  }));

  it('should call Google Analytics when tracking an event', () => {
    spyOn(analyticsService, 'ga');

    analyticsService.event('category', 'action');

    expect(analyticsService.ga).toHaveBeenCalled();
  });

});
