import {
  it,
  inject,
  describe,
  beforeEachProviders
} from '@angular/core/testing';

import {Component} from '@angular/core';
import {ActivatedRoute} from '@angular/router';

// Load the implementations that should be tested
import {AboutComponent} from './about.component';

describe('AboutComponent', () => {
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
    About
  ]);

  it('should log ngOnInit', inject([ About ], (about) => {
    spyOn(console, 'log');
    expect(console.log).not.toHaveBeenCalled();

    about.ngOnInit();
    expect(console.log).toHaveBeenCalled();
  }));

});
