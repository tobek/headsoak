// For vendors for example jQuery, Lodash, angular2-jwt just import them here unless you plan on
// chunking vendors files for async loading. You would need to import the async loaded vendors
// at the entry point of the async loaded file. Also see custom-typings.d.ts as you also need to
// run `typings install x` where `x` is your module

// Angular 2
import '@angular/platform-browser';
import '@angular/platform-browser-dynamic';
import '@angular/core';
import '@angular/common';
import '@angular/forms';
import '@angular/http';
import '@angular/router';

// RxJS
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/mergeMap';

// Ace editor
import 'brace';
import 'brace/mode/javascript';
// import 'brace/theme/monokai';

// The rest
import 'd3';
import 'd3-bboxCollide';
import 'firebase';
import 'hammer-timejs';
import 'intl';
import 'intl/locale-data/jsonp/en';
import 'jquery';
import 'lodash';
import 'lunr';
import 'mousetrap';
import 'mousetrap-global-bind';
import 'sentiment';
import 'toastr';
import 'app/vendor/darsain-tooltips.js';

if ('production' === ENV) {
  // Production


} else {
  // Development

}
