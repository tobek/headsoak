angular.module('fuzzyMatchSorter', []).factory('fuzzyMatchSort', function() {

  // one situation in which this algorithm isn't quite optimal: you search "ep" against "extra special powers" - after matching `e` it will look ahead to the `s` in self, not match `p`, and iterate through `experience` until matching the `p` there, increasing score in the process. this could be fixed by look at every char after space in the remaining substring, which i didn't bother to do
  // also, separator maybe shouldn't be just ' '. but for now this is fine
  function fuzzyInitialismMatch(needle, haystack) {
    needle = needle.toLowerCase();
    var origHaystack = haystack;
    haystack = haystack.toLowerCase();

    if (needle === haystack) {
      return {
        value: origHaystack,
        score: -1,
        highlighted: "<b>"+origHaystack+"</b>"
      };
    }

    var score = 0;
    var sinceLastMatch = 0; // will be updated as we iterate and added to score on match
    var i = -1; // index of the haystack char we're checking. -1 cause logic is easier to i++ at beginning of loop
    var j = 0; // index of the needle char we're looking for
    var checkNextWord = true; // flag for whether or not to check first letter of next word for match
    var matchedCharList = []; // array of indices in haystack that match characters from needle, used for highlighting matches

    while (true) { // can't do for-loop cause lookahead sometimes pushes us out of it
      if (j == needle.length) break; // we're done
      if (++i >= haystack.length) return false; // no match

      if (haystack[i] == needle[j]) {
        // matched!
        score += sinceLastMatch;
        sinceLastMatch = 0;
        j++; // look for next needle char
        checkNextWord = true;
        matchedCharList.push(i);
        continue;
      }
      else if (checkNextWord) {
        // let's check and see if the letter we're looking for is after the next space
        var indexOfNextSpace = haystack.substring(i+1).indexOf(' '); // substring to get the remainder of haystack
        if (indexOfNextSpace !== -1) {
          var indexOfCharAfterNextSpace = indexOfNextSpace+1 +i+1; // +i+1 to get index relative to haystack instead of remainder
          if (haystack[indexOfCharAfterNextSpace] == needle[j]) {
            // matched!
            sinceLastMatch = 0; // reset this. we'll leave `score` as is - char after space is like 0
            j++; // look for next needle char
            i = indexOfCharAfterNextSpace; // jump ahead to start looking from after there. don't need to +1 as that'll happen at the end of this for-loop iteration
            matchedCharList.push(i);
            continue;
          }
        }
        checkNextWord = false;
      }

      // keep searching
      sinceLastMatch++;
      if (haystack[i] == ' ') {
        checkNextWord = true;
      }
    }

    // only way to leave while loop is to return false or break on success, so we succeded
    return {
      value: origHaystack,
      score: score,
      highlighted: highlightStringIndices(origHaystack, matchedCharList, "<b>", "</b>")
    };
  }

  // s is a string, indices is array of indices, before and after are strings (e.g. HTML) to insert before/after each index
  // could be improved to detect ranges. currently ("match", [0,1,2], "<b>", "</b>") results in "<b>m</b><b>a</b><b>t</b>ch" which is a bit silly
  function highlightStringIndices(s, indices, before, after) {
    var ret = "";
    var last = 0;

    indices.forEach(function(i) {
      ret += s.substring(last, i);
      ret += before + s[i] + after;
      last = i+1;
    });

    ret += s.substring(last, s.length);

    return ret;
  }

  // returns array of elements from array of haystacks that fuzzily match needle
  function rankedFuzzyInitialismMatches(needle, haystacks) {
    var matches = [];
    haystacks.forEach(function(tag) {
      var result = fuzzyInitialismMatch(needle, tag);
      if (result !== false) {
        matches.push(result);
      }
    });

    matches.sort(function(a, b) {
      return a.score - b.score;
    });

    return matches;
  }

  return rankedFuzzyInitialismMatches;

});