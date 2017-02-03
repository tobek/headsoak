// Stuff needed for smart tags

/** @TODO/build/smartness @TODO/refactor
 * 
 * We are currently packaging this as a separate bundle, but we want to a) load this asynchronously when necessary, and b) ensure that common code between this and the `vendor` bundle are put in `vendro` (this may already be the case, haven't checked.)
 *
 * This is important since the size of just retext and retext-keywords is 2.4mb (600k gzipped) because it includes a part of speech tagger with entire english lexicon in it.
 *
 * I couldn't get this to work. Here are some resources:
 *
 * - https://github.com/petehunt/webpack-howto#9-async-loading
 * - http://stackoverflow.com/questions/35514785/webpack-2-code-splitting-top-level-dependencies
 * - https://github.com/webpack/webpack/tree/master/examples/extra-async-chunk
 * - https://github.com/webpack/webpack/tree/master/examples/extra-async-chunk-advanced
 * - https://webpack.js.org/guides/code-splitting-require/
 * - http://stackoverflow.com/questions/35184240/webpack-error-in-commonschunkplugin-while-running-in-normal-mode-its-not-allow
 *
 * Maybe we can do it outside of webpack, just need to exclude the bundle from index.html and obtain the name of the bundle with hash in it, and load it manually (and either "ingest" it into webpack or have it be totally standalone).
 *
 * Search for `@TODO/build/smartness` throughout codebase for more notes
 */

import 'nlcst-to-string';
import 'retext';
import 'retext-keywords';
