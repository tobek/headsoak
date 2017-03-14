/**
 * Web worker for handling access to libraries needed for smart tags.
 *
 * @NOTE: Errors thrown here will trigger `onerror` function on the Worker instance created by the client script. However, this means we'll lose the `id` associated with the request, so the caller won't know when to return. We should always then catch errors and send them back through `postMessage`.
 *
 * @TODO/build In theory we could be using shared dependencies that are loaded in vendor bundle. I'm not sure how to get the build to find common chunks, but if we could, then we could load that here with `importScripts`. However, loading the *entire* vendor bundle in here would be hugely wasteful even if cached, cause we'd have to parse and run it and as of writing (March 2017) vendor bundle is over 2mb uncompressed. So we'd need one vendor bundle for code common to client and worker, and another vendor bundle for client-only vendor stuff... A quick hacky check of built files now found that there were about 10 shared modules, all very small. So for now this is fine.
 *
 * @HACK @TODO/refactor @TODO/build This web worker needs to be in a different typescript context than the browser stuff and I'm not really sure how to make it work. Instead, things expected to be in global scope forworkers (as defined in `lib.webworker.d.ts`) just use `(<any> self).foo` instead. The following typescript reference would fix this (and remove need for `<any>` hack) but it fucks declarations in the rest of the app. In the mean time, be careful not to rely on stuff in browser `window` scope! See <https://developer.mozilla.org/en-US/docs/Web/Reference/Functions_and_classes_available_to_workers>.
 */
// /// <reference path="../node_modules/typescript/lib/lib.webworker.d.ts" />

// import {each as _each} from 'lodash'; // @TODO/optimization @TODO/build Looks like build isn't pruning things and is loading the entire lodash library.
// _each([1, 2, 3], console.log.bind(console));

import * as sentiment from 'sentiment';
import * as retext from 'retext';
import * as retextKeywords from 'retext-keywords';
import * as retextProfanities from 'retext-profanities';

export type GeniusFunction = 'sentiment' | 'keywords' | 'profanities';
export interface GeniusRequest {
  id: string | number;
  fn: GeniusFunction;
  args: any[];
}
export interface GeniusRequestMessage extends MessageEvent {
  data: GeniusRequest;
}
export interface GeniusResponse {
  id: string | number;
  result?: any;
  err?: any;
}
export interface GeniusResponseMessage extends MessageEvent {
  data: GeniusResponse;
}


console.log('[GeniusWorker] Starting');

const processors = {
  keywords: retext().use(retextKeywords),
  profanities: retext().use(retextProfanities),
};

// Basically just for handy typing:
const postResponse: (GeniusResponse) => void = (<any> self).postMessage;
(<any> self).onmessage = handleMessage;

function handleMessage(mesg: GeniusRequestMessage) {
  // console.log('[GeniusWorker] Received', mesg.data);

  try {
    handleRequest(mesg.data, function(res) {
      postResponse(res);
    });
  }
  catch (err) {
    postResponse({ id: mesg.data.id, err: err });
  }
};

function handleRequest(req: GeniusRequest, cb: (GeniusResponse) => void) {
  const res: GeniusResponse = { id: req.id };

  if (req.fn === 'sentiment') {
    res.result = sentiment.apply(sentiment, req.args);
    cb(res);
  }
  else {
    processors[req.fn].process(req.args[0], function(err, doc) {
      if (err) {
        res.err = err;
      }

      res.result = doc;

      cb(res);
    });
  }
}

