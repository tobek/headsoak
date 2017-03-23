/*
 * Vendor dependencies
 *
 * To pack these in `vendor` bundle they have to go in `webpack.dev.js` too. See `src/app/vendor/README.md`. Dependencies specifically imported elsewhere can be omitted here (but must be in `webpack.dev.js`).
 *
 * @NOTE: Vendor packages only used for smart tags (and happily not requiring many shared dependencies here, becuase I'm not sure how to make that work) are in `genius.ts` worker.
 *
 * @REMOVED/smartness More vendor packages required for smart tags used to be in `smartness.browser.ts`
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
import 'mousetrap';
import 'mousetrap-global-bind';
import 'toastr';
import 'app/vendor/darsain-tooltips.min';
