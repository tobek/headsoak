import {AutocompleteSuggestion} from './autocomplete.service';

// One situation in which this algorithm isn't quite optimal: you search "ep" against "extra special powers" - after matching `e` it will look ahead to the `s` in "special", not match `p`, and iterate through `special` until matching the `p` there, increasing score in the process. this could be fixed by look at every char after space in the remaining substring, which i didn't bother to do
// Also, separator maybe shouldn't be just ' '. but for now this is fine


function fuzzyInitialismMatch(needle: string, haystack: AutocompleteSuggestion): AutocompleteSuggestion {
  needle = needle.toLowerCase();
  var haystackStr = haystack.value.toLowerCase();

  if (needle === haystackStr) {
    haystack.score = -1;
    haystack.highlighted = '<b>' + haystack.value + '</b>';
    return haystack;
  }

  var score = 0;
  var sinceLastMatch = 0; // will be updated as we iterate and added to score on match
  var i = -1; // index of the haystackStr char we're checking. -1 cause logic is easier to i++ at beginning of loop
  var j = 0; // index of the needle char we're looking for
  var checkNextWord = true; // flag for whether or not to check first letter of next word for match
  var matchedCharList = []; // array of indices in haystackStr that match characters from needle, used for highlighting matches

  while (true) { // can't do for-loop cause lookahead sometimes pushes us out of it
    if (j === needle.length) break; // we're done
    if (++i >= haystackStr.length) return null; // no match

    if (haystackStr[i] === needle[j]) {
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
      var indexOfNextSpace = haystackStr.substring(i + 1).indexOf(' '); // substring to get the remainder of haystackStr
      if (indexOfNextSpace !== -1) {
        var indexOfCharAfterNextSpace = indexOfNextSpace + 1 + i + 1; // +i+1 to get index relative to haystackStr instead of remainder
        if (haystackStr[indexOfCharAfterNextSpace] === needle[j]) {
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
    if (haystackStr[i] === ' ') {
      checkNextWord = true;
    }
  }

  // only way to leave while loop is to return false or break on success, so we succeded
  haystack.score = score;
  haystack.highlighted = highlightStringIndices(haystack.value, matchedCharList, '<b>', '</b>');
  return haystack;
}

// s is a string, indices is array of indices, before and after are strings (e.g. HTML) to insert before/after each index
// could be improved to detect ranges. currently ("match", [0,1,2], "<b>", "</b>") results in "<b>m</b><b>a</b><b>t</b>ch" which is a bit silly
function highlightStringIndices(s, indices, before, after) {
  var ret = '';
  var last = 0;

  indices.forEach(function(i) {
    ret += s.substring(last, i);
    ret += before + s[i] + after;
    last = i + 1;
  });

  ret += s.substring(last, s.length);

  return ret;
}

// returns array of elements from array of haystacks that fuzzily match needle
function rankedFuzzyInitialismMatches(needle: string, haystacks: AutocompleteSuggestion[]): AutocompleteSuggestion[] {
  const matches: AutocompleteSuggestion[] = [];

  haystacks.forEach(function(suggestion: AutocompleteSuggestion) {
    var result = fuzzyInitialismMatch(needle, suggestion);
    if (result) {
      matches.push(result);
    }
  });

  let score;
  matches.sort(function(a, b) {
    // Lower scores come first - so if return val is less than 0, `a` comes first

    score = a.score - b.score

    if (score !== 0) {
      return score;
    }
    // else if (a.data && a.data.tag && b.data && b.data.tag) {
    //   // We could do something by comparing actual Tag instances
    // }
    else {
      // Shorter suggestions first
      return a.value.length - b.value.length;
    }
  });

  return matches;
}

export let fuzzyMatchSort = rankedFuzzyInitialismMatches;

