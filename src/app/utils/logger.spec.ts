import {Logger} from './logger';

describe('Logger', () => {
  beforeEach(() => {
    this.logger = new Logger('TestThing');
  });

  it('should log, info, warn, and error things', () => {
    spyOn(console, 'log');
    spyOn(console, 'info');
    spyOn(console, 'warn');
    spyOn(console, 'error');

    this.logger.log('stuff');
    this.logger.info('stuff');
    this.logger.warn('stuff');
    this.logger.error('stuff');

    expect(console.log).toHaveBeenCalledWith('[TestThing]', 'stuff');
    expect(console.info).toHaveBeenCalledWith('[TestThing]', 'stuff');
    expect(console.warn).toHaveBeenCalledWith('[TestThing]', 'stuff');
    expect(console.error).toHaveBeenCalledWith('[TestThing]', 'stuff');
  });

  it('should log multiple parameters and individual arguments', () => {
    spyOn(console, 'log');

    this.logger.log('stuff', 123, 'more stuff');

    expect(console.log).toHaveBeenCalledWith('[TestThing]', 'stuff', 123, 'more stuff');
  });

});
