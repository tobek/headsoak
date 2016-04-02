describe('App', () => {

  beforeEach(() => {
    // change hash depending on router LocationStrategy
    browser.get('/');
  });


  it('should have a title', () => {
    let subject = browser.getTitle();
    let result  = 'nutmeg';
    expect(subject).toEqual(result);
  });

  it('should have `HMR data test` x-large', () => {
    debugger;
    let subject = element(by.css('[x-large]')).getText();
    let result  = 'HMR data test';
    expect(subject).toEqual(result);
  });


});
