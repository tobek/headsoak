/*
 * Vendor dependencies
 *
 * To pack these in `vendor` bundle they have to go in `webpack.dev.js` too. See `src/app/vendor/README.md`. Dependencies specifically imported elsewhere can be omitted here (but must be in `webpack.dev.js`).
 *
 */

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
import 'app/vendor/darsain-tooltips.min';

// @TODO/build/smartness More vendor packages required for smart tags are in `smartness.browser.ts`
