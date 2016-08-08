import {
  beforeEachProviders,
  describe,
  inject,
  it
} from '@angular/core/testing';

// Load the implementations that should be tested
import {HomeComponent} from './home.component';

describe('HomeComponent', () => {
  // provide our implementations or mocks to the dependency injector
  beforeEachProviders(() => [
    Home
  ]);

  it('should have a title', inject([ Home ], (home) => {
    expect(!!home.title).toEqual(true);
  }));

  it('should log ngOnInit', inject([ Home ], (home) => {
    spyOn(console, 'log');
    expect(console.log).not.toHaveBeenCalled();

    home.ngOnInit();
    expect(console.log).toHaveBeenCalled();
  }));

});
