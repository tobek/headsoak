import {
  it,
  inject,
  describe,
  beforeEachProviders
} from '@angular/core/testing';

import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

// Load the implementations that should be tested
import {SettingsComponent} from './settings.component';

describe('SettingsComponent', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    {
      provide: ActivatedRoute,
      useValue: {
        data: {
          subscribe: (fn) => fn({yourData: 'yolo'})
        }
      }
    },
    SettingsComponent
  ]);

  it('should log ngOnInit', inject([ SettingsComponent ], (settings) => {
    spyOn(console, 'log');
    expect(console.log).not.toHaveBeenCalled();

    settings.ngOnInit();
    expect(console.log).toHaveBeenCalled();
  }));

});
