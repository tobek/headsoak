This directory is for vendor JS that isn't packed in NPM modules, and/or whose packages don't have built assets or easy ways to create them.

Unfortunately it doesn't seem possible to actually include these in the `vendor` bundle based on the current setup - see comments in `webpack.dev.js` and my comments on <https://github.com/shlomiassaf/webpack-dll-bundles-plugin/issues/8>. So when imported they'll get bundled in `main`.
