describe('LoginComponent', () => {

  var EMAIL = 'email@example.com';
  var PASSWORD = 'abc';

  beforeEach(() => {
    browser.get('/');
  });

  it('should create an account and log out', () => {
    element(by.css('.create-account-link')).click();

    browser.executeScript('document.querySelectorAll("#create-account-form input[name=email]")[0].value = "' + EMAIL + '";');
    element(by.css('#create-account-form input[name=email]')).sendKeys(' ');
    element(by.css('#create-account-form input[name=email]')).sendKeys(protractor.Key.BACK_SPACE);

    browser.executeScript('document.querySelectorAll("#create-account-form input[name=pass1]")[0].value = "' + PASSWORD + '";');
    element(by.css('#create-account-form input[name=pass1]')).sendKeys(' ');
    element(by.css('#create-account-form input[name=pass1]')).sendKeys(protractor.Key.BACK_SPACE);

    browser.executeScript('document.querySelectorAll("#create-account-form input[name=pass2]")[0].value = "' + PASSWORD + '";');
    element(by.css('#create-account-form input[name=pass2]')).sendKeys(' ');
    element(by.css('#create-account-form input[name=pass2]')).sendKeys(protractor.Key.BACK_SPACE);

    element(by.css('#create-account-form input[type=submit]')).click();

    browser.wait(protractor.until.elementLocated(by.css('.logout-link')), 10000).then(() => {
      expect(element(by.css('.logout-link')).isPresent()).toBe(true);
      element(by.css('.logout-link')).click();

      browser.wait(protractor.until.elementLocated(by.css('#login-form')), 10000).then(() => {
        expect(element(by.css('#login-form')).isPresent()).toBe(true);
      });
    });
  });

  it('should log in and delete account', () => {
    // The following doesn't work casue webdriver sendkeys is flaky as hell at least on OS X Chrome - even with adding clicking and clearing.
    // element(by.css('#login-form input[name=email]')).click();
    // element(by.css('#login-form input[name=email]')).clear();
    // element(by.css('#login-form input[name=email]')).sendKeys(EMAIL);
    // element(by.css('#login-form input[name=password]')).click();
    // element(by.css('#login-form input[name=password]')).clear();
    // element(by.css('#login-form input[name=password]')).sendKeys(PASSWORD);

    // This shim suggested by https://github.com/angular/protractor/issues/562 doesn't work either, not implemented yet apparently:
    // element(by.css('#login-form input[name=email]')).setValue(EMAIL);
    // element(by.css('#login-form input[name=password]')).setValue(PASSWORD);

    // So, horrible hack to execute JS to set values, and then even more horrible hack to just put a space and backspace in each input so that angular picks up model change
    browser.executeScript('document.querySelectorAll("#login-form input[name=email]")[0].value = "' + EMAIL + '";');
    element(by.css('#login-form input[name=email]')).sendKeys(' ');
    element(by.css('#login-form input[name=email]')).sendKeys(protractor.Key.BACK_SPACE);

    browser.executeScript('document.querySelectorAll("#login-form input[name=password]")[0].value = "' + PASSWORD + '";');
    element(by.css('#login-form input[name=password]')).sendKeys(' ');
    element(by.css('#login-form input[name=password]')).sendKeys(protractor.Key.BACK_SPACE);

    element(by.css('#login-form input[type=submit]')).click();

    browser.wait(protractor.until.elementLocated(by.css('.delete-account-link')), 30000).then(() => {
      expect(element(by.css('.delete-account-link')).isPresent()).toBe(true);
      element(by.css('.delete-account-link')).click();

      var prompt = browser.switchTo().alert()
      prompt.sendKeys('I\'M REALLY REALLY SURE');
      prompt.accept();

      prompt = browser.switchTo().alert()
      prompt.sendKeys(PASSWORD);
      prompt.accept();

      browser.wait(protractor.until.elementLocated(by.css('#login-form')), 10000).then(() => {
        expect(element(by.css('#login-form')).isPresent()).toBe(true);
      });
    });
  });

});
