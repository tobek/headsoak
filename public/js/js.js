"use strict";

// https://github.com/andyet/ConsoleDummy.js
(function(b){function c(){}for(var d="error,group,groupCollapsed,groupEnd,log,time,timeEnd,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});

/*

### DO NOW

- bug: when you delete a newly created tag it doesn't drop down below 0
- when you click on a tag, prepend it to the query?
- x clear button in query
- automatically set focus when you add new thing, and when it loses focus, close text box. http://stackoverflow.com/a/17739731/458614


- tag list
  - list them
  - show # in ()s (live update)
  - search bar + separate index
  - sort (alpha, mod, create, count)
  - add new
  - delete (confirm are you sure?)
- shortcuts
  - new nut
  - new tag on nut
  - new tag
  - ctrl+l move to query bar
  - verify tab goes between textareas in other browsers
- implement sort by query match strength
- figure out what happens if focusin happens before focusout. nut-specific values? old and new ones that get cycled? eh

Will the JavaScript `focusout` event always happen before the `focusin` event when moving focus from one element to another?
E.g. if element A has focus, and you change focus to element B (whether by hitting tab, clicking, JS command, etc.) will there always be a `focusout` event on element A before the `focusin` on element B?
Intuitively the answer should be yes, but I wanted to know whether I can rely on this across browsers.

### TODO

- make empty nuts save in interface, otherwise if you add an empty nut and then try to add tags, it dies. we are allowing empty nuts
- add delete nut button and functionality
- configurable max-height for nuts but automatically expands otherwise
- highlight matched query in search results
- dbg time for lunr search
- autocomplete tags
- how/where to show modified/created dates on nuts? only on hover or focus?
- how should we communicate a nut being saved? downward (and downward moving) arrow icon in bottom right of textarea?
- every 5 seconds, as you're typing, you get a new nut. the `history` will be stupid. do session-based or focus based with some buffer or something
- right now i always display everything in #nuts. this could get unwieldy. this will have to be fixed in various places
  - sortNuts() will have to retrieve query but what will it do with new nuts?
- add config to control how tags are sorted on an individual nut? alphabetical, most/fewest tags, recently/oldest modified/created
- ctrl+z. how best to implement? ask on quora or stack overflow? stack of actions, each with a `do` and `undo` action you can execute (`do` needed so you can redo). e.g. if you do deleteTag(4), you'd push an object onto the stack with `do` = `deleteTag(4)` and `undo` = `createTag({whatever})` having saved the state of the tag and all the docs it was on
- note: duplicate tags names not allowed, but tag names are case sensitive

### QUESTIONS

- should nuts automatically resort? like if you're sorting by latest modified or # of tags and you modify or add/remove tags. i'm thinking not

### NOTES/REMINDERS

- indexing nm.store and nm.tags etc does NOT require parseInt(), but indexOf() in docs and tags DOES

*/

// ============================== //
// ==== SET UP NUTMEG OBJECT ==== //
// ============================== //
/*
##    ## ##     ## ######## ##     ## ########  ######       #######  ########        ## 
###   ## ##     ##    ##    ###   ### ##       ##    ##     ##     ## ##     ##       ## 
####  ## ##     ##    ##    #### #### ##       ##           ##     ## ##     ##       ## 
## ## ## ##     ##    ##    ## ### ## ######   ##   ####    ##     ## ########        ## 
##  #### ##     ##    ##    ##     ## ##       ##    ##     ##     ## ##     ## ##    ## 
##   ### ##     ##    ##    ##     ## ##       ##    ##     ##     ## ##     ## ##    ## 
##    ##  #######     ##    ##     ## ########  ######       #######  ########   ######  
*/

var nm = {
  config: {
    maxHistory: 100 // how many revisions of each nut to save
  },
  index: lunr(function () {
    // this.field('title', {boost: 10});
    this.field('tags', {boost: 100});
    this.field('body', {boost: 1});
    this.ref('id');
  }),
  store: [], // index in array will be id of tag. load from mongo into memory?
  tags: [], // index in array will be id of tag

  // these are what get saved in browser local storage
  dataFields: ['config', 'store', 'tags'],

  // will trigger an entire re-index for lunr
  loadData: function() {
    console.time("loadData");
    $.extend(this, JSON.parse(localStorage.nm));
    this.reIndex();
    // this.face.populate();
    console.timeEnd("loadData");
  },

  reIndex: function() {
    console.time("re-indexing");
    _.each(_.keys(this.store), this.updateNutInIndex, this);
    console.timeEnd("re-indexing");
  },

  saveData: function() {
    console.time("saveData");
    var saveMe = {};
    this.dataFields.map(function(field) {
      saveMe[field] = this[field];
    }, this);
    localStorage.nm = JSON.stringify(saveMe);
    console.timeEnd("saveData");
  },

  // ==== NUT FUNCTIONS ==== //
  /*
       d8b   db db    db d888888b   d88888b db    db d8b   db  .o88b. .d8888. 
       888o  88 88    88 `~~88~~'   88'     88    88 888o  88 d8P  Y8 88'  YP 
       88V8o 88 88    88    88      88ooo   88    88 88V8o 88 8P      `8bo.   
C8888D 88 V8o88 88    88    88      88~~~   88    88 88 V8o88 8b        `Y8b. 
       88  V888 88b  d88    88      88      88b  d88 88  V888 Y8b  d8 db   8D 
       VP   V8P ~Y8888P'    YP      YP      ~Y8888P' VP   V8P  `Y88P' `8888Y'
  */


  // call whenever a tag is updated
  // pass no id if tag was deleted
  // 1: updates `modified` (unless no id is sent, meaning a tag was deleted)
  // 2: redraws tag browser
  tagUpdated: function(id) {
    if (id) {
      this.tags[id].modified = (new Date).getTime();
    }
    this.saveData();
  },

  // ==== TAG FUNCTIONS ==== //
  /*
       d888888b  .d8b.   d888b    d88888b db    db d8b   db  .o88b. .d8888. 
       `~~88~~' d8' `8b 88' Y8b   88'     88    88 888o  88 d8P  Y8 88'  YP 
          88    88ooo88 88        88ooo   88    88 88V8o 88 8P      `8bo.   
C8888D    88    88~~~88 88  ooo   88~~~   88    88 88 V8o88 8b        `Y8b. 
          88    88   88 88. ~8~   88      88b  d88 88  V888 Y8b  d8 db   8D 
          YP    YP   YP  Y888P    YP      ~Y8888P' VP   V8P  `Y88P' `8888Y'
  */

  /* probably to change name or color
   */
  updateTag: function(id, tag) {
    // any new values will overwrite the old:
    this.tags[id] = $.extend(this.tags[id], tag);
    this.tags[id].modified = (new Date).getTime();
    this.tagUpdated(id);
  },

  deleteTag: function(id) {
    // TODO
    // go through each doc id and splice it out
    this.tagUpdated();
  },

  // ==== RETRIEVAL FUNCTIONS ==== //

  getNutsBySubstring: function(s) {
    return this.index.search(s); // by default ANDs spaces: "foo bar" will search foo AND bar
  },
  // query is array
  getNutsByQuery: function(query) {

  },

  getNutsByTagName: function(name) {

  },
  getNutsByTagId: function(id) {
    return this.tags[id].docs;
  },


  // ==== INTERFACE FUNCTIONS ==== //
  /*

       d888888b d8b   db d888888b d88888b d8888b. d88888b  .d8b.   .o88b. d88888b 
         `88'   888o  88 `~~88~~' 88'     88  `8D 88'     d8' `8b d8P  Y8 88'     
          88    88V8o 88    88    88ooooo 88oobY' 88ooo   88ooo88 8P      88ooooo 
C8888D    88    88 V8o88    88    88~~~~~ 88`8b   88~~~   88~~~88 8b      88~~~~~ 
         .88.   88  V888    88    88.     88 `88. 88      88   88 Y8b  d8 88.     
       Y888888P VP   V8P    YP    Y88888P 88   YD YP      YP   YP  `Y88P' Y88888P
  */

  face: {
    autosizeAllNuts: function() {
      $(".nut textarea").each(function(i, ta){
        nm.face.autosizeNuts.call(ta);
      });
    },

    autosizeNuts: function() {
      this.style.height = "";
      this.style.height = this.scrollHeight + 'px';
    },

    // recieves jQuery object containing li.nut
    // TODO console.group this shit
    saveNut: function(nut) {
      return;
      console.log("saveNut called");

      var ta = nut.children("textarea");

      if (ta.val() != nutDiff) {
        console.log("new content!");
        nutDiff = ta.val();

        if (!nut.attr("data-id")) { // means this must be a new nut
          console.log("in fact, an entirely new nut");
          // createNut() returns new id, store that in data-id
          nut.attr("data-id", nm.createNut({body: ta.val()}));
        }
        else {
          nm.updateNut(nut.attr("data-id"), {body: ta.val()});
        }

        console.log(nut.attr("data-id") + " saved");

        // TODO better color animation
        ta.css("color", "green");
        window.setTimeout(function() {
          ta.css("color", "black");
        }, 500);
      }
      else {
        console.log("nothing has changed");
      }
    }
  } // end interface functions

}; // end defining and declaring nutmeg





/*
 ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##  
#### #### #### #### #### #### #### #### #### #### #### #### #### #### #### #### 
 ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##  
                                                                                
 ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##  
#### #### #### #### #### #### #### #### #### #### #### #### #### #### #### #### 
 ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##   ##  
*/

var saveInterval; // window.setInterval timer for saving
var nutDiff; // stores body of nut to check if it's changed - only saves if it has

$(function() { // upon DOM having loaded

  // ==== EVENT LISTENERS ==== //
  /*

d88888b db    db d88888b d8b   db d888888b .d8888. 
88'     88    88 88'     888o  88 `~~88~~' 88'  YP 
88ooooo Y8    8P 88ooooo 88V8o 88    88    `8bo.   
88~~~~~ `8b  d8' 88~~~~~ 88 V8o88    88      `Y8b. 
88.      `8bd8'  88.     88  V888    88    db   8D 
Y88888P    YP    Y88888P VP   V8P    YP    `8888Y'
  */

  // focus events: when you focus on a nut, start autosaving until you unfocus

  // attach to #nuts so that even new textareas within it trigger this
  $("#nuts").on("focusin", "textarea", function(e){
    var nut = $(e.target).parents(".nut");
    console.log("focus on " + nut.attr("data-id"));
    nutDiff = nut.children("textarea").val();
    saveInterval = window.setInterval(function() {
      nm.face.saveNut(nut);
    }, 5000);
  });

  $("#nuts").on("focusout", "textarea", function(e){
    var nut = $(e.target).parents(".nut");
    console.log("focus out from " + nut.attr("data-id"));
    nm.face.saveNut(nut);
    clearInterval(saveInterval);
  });

  $("#nuts").on("keydown", "textarea", nm.face.autosizeNuts);

  // tag autocomplete should start with 1 keypress and be sorted by most used (configurable?)
  $("#query input").on("keyup", function(e) {
    // only start live searching once 3 chars have been entered
    if ($("#query input").val().length > 2) {
      var results = nm.index.search($("#query input").val());
      console.log(results);
      // results is array of objects each containing `ref` and `score`
      // nm.face.populate(results.map(function(doc){ return doc.ref; }));
    }
    else {
      // go back to show all
      // nm.face.populate();
    }
  });

  // for other keypress listening, e.keyCode, e.metaKey, e.shiftKey, e.ctrlKey, e.altKey


  // ==== INITIALIZE NUTMEG ==== //

  // nutmeg's been used before on this browser, load data
  localStorage.clear(); // actually don't
  if (localStorage.nm) {
    nm.loadData();
  }
  // load dummy data
  else {
    // init code wuz here

    // nm.face.populate();

    // temporary hack because angular tag sort select is created before any tags, so we need to reapply model to sort (and therefore display) the tags
    $("#tagContainer .sort select").trigger("change");
  }

  nm.face.autosizeAllNuts();

  // ==== AUTOCOMPLETE ==== //

  // TODO store this better and update on tagsUpdated()
  $( "#query input" ).autocomplete({
    source: _.map(nm.tags, function(tag) { return tag.name; })
  });

});

// ANGULARFIRE

// access this shit from outside scope
// angular.element($("body")).scope().t.tags.push({name:"foooo"})
// angular.element($("body")).scope().$apply()

// TODO look at angularFireCollection for explicit instead of implicit syncing
var ngApp = angular.module('nutmeg',['firebase'])
.controller('Nutmeg', ['$scope', 'angularFire',function($s, angularFire) {

  var ref = new Firebase('https://nutmeg.firebaseio.com/');

  $s.n = {
    nuts: [],
    sortOpts: [
      {field: "modified", rev: true, name: "Recently modified"},
      {field: "modified", rev: false, name: "Oldest modified"},
      {field: "created", rev: true, name: "Recently created"},
      {field: "created", rev: false, name: "Oldest created"},
      {field: "body.length", rev: true, name: "Longest"},
      {field: "body.length", rev: false, name: "Shortest"},
      {field: "tags.length", rev: true, name: "Most Tags"},
      {field: "tags.length", rev: false, name: "Fewest tags"}
      // TODO: query match strength
    ],

    /* 
     * merge passed nut with defaults and store it
     * NOTE: this is allowing totally empty nuts... that's how we make blank new nuts. also would be a minor pain to disallow (what if you create non-empty and then update to empty?) and i can't see it causing problems so it's okay. we can do a "this nut is empty would you like to delete?" message maybe
     */
    createNut: function(nut) {
      var newId = this.nuts.length; // will be index of new nut
      this.nuts.push(_.defaults(nut, {
        // default nut:
        // title: null,
        body: null,
        tags: [], // array of tag ids
        created: (new Date).getTime(),
        modified: (new Date).getTime(),
        history: [], // an array of nuts, last is the latest
        id: newId
      }));

      if (nut.tags && nut.tags.length > 0) {
        // add this doc id to each of the tags
        nut.tags.forEach(function(tagId){
          $s.n.addTagIdToNut(tagId, newId);
        });
      }

      return newId;
    },
    createNuts: function(nuts){
      nuts.forEach(function(nut) {
        $s.n.createNut(nut);
      });
    },

    addTagNameToNut: function(tagName, nut) {
      // TODO: inline creator, that autosuggests (the last autosuggestion always being "create new tag [current text]")
      if (tagName) {
        // TODO check that if this is a new nut it gets saved and given an id before this - e.g. focusout happens first
        var tagId = $s.t.getTagIdByName(tagName);

        if (tagId === -1) {
          console.log("creating new tag " + tagName);
          tagId = $s.t.createTag({name: tagName});
        }

        if (nut.tags.indexOf(parseInt(tagId)) !== -1) {
          console.log("tag "+tagName+" already exists on nut "+nut.id);
        }
        else {
          this.addTagIdToNut(tagId, nut.id);
        }
      this.addTagName = ""; // clear input
      // TODO hide input. we can't do $s.n.addingTag cause then every input field will appear at once. don't want to do nut.addingTag either cause that seems messy. maybe manually blur the input so that ng-blur does its thing? pure JS has a .blur() function
      }
    },

    // each nut has an array of tags and each tag has an array of nuts it belongs to. this function ensures this remains consistent when adding tags to nuts
    addTagIdToNut: function(tagId, nutId) {
      console.log("adding tag "+tagId+" to nut "+nutId);
      // add tag id to nut if it's not already there
      if ($s.n.nuts[nutId].tags.indexOf(tagId) === -1 ) {
        $s.n.nuts[nutId].tags.push(tagId);
        $s.n.nuts[nutId].modified = (new Date).getTime();
      }
      // add nut id to tag if it's not already there
      if ($s.t.tags[tagId].docs.indexOf(nutId) === -1 ) {
        $s.t.tags[tagId].docs.push(nutId);
        $s.t.tags[tagId].modified = (new Date).getTime();
      }
      $s.t.tags[tagId].modified = (new Date).getTime();
    },
    removeTagIdFromNut: function(nutId, tagId) { // TODO test
      console.log("removing tag "+tagId+" from nut "+nutId);
      // remove tag id from nut (check it's there first so we don't splice out -1)
      if ($s.n.nuts[nutId].tags.indexOf(tagId) !== -1 ) {
        $s.n.nuts[nutId].tags.splice($s.n.nuts[nutId].tags.indexOf(tagId), 1);
      }
      // you get it
      if ($s.t.tags[tagId].docs.indexOf(nutId) !== -1 ) {
        $s.t.tags[tagId].docs.splice($s.t.tags[tagId].docs.indexOf(nutId), 1);
      }
      $s.t.tags[tagId].modified = (new Date).getTime();
    },

    /*
     * warning: passing in nut.tags will completely overwrite existing tags on this nut. use addTagToNut and removeTagFromNut if you don't want to do that
     * TODO: if nut has tags, use _ intersect/union/etc to delete removed tags and add new ones
     * note: we store entire state of nut in each history entry. could instead store just changes if this gets to big
     * note 2: we use shallow jQuery extend to modify existing nut with passed in nut. if we have more complicated attributes later we might want a deep clone/extend like in lodash.com
     * NOTE: history is only updated here - the only place where body text can be updated. don't need to add new history state for adding tags and stuff - though tag differences will be stored in history
     */
    updateNut: function(id, nut) {
      var oldState = $.extend(true, {}, this.store[id]); // deep clone ourself
      delete oldState.history; // no need for the history to have history
      this.store[id].history.push(oldState); // append ourselves into history

      if (this.store[id].history.length > this.config.maxHistory) {
        this.store[id].history.shift(); // chuck the oldest one
      }

      // use extend to fold new values into old nut:
      delete nut.history; // (first let's do this - don't let this function ovewrite history, could lose stuff)
      this.store[id].modified = (new Date).getTime(); // do before extend() in case for some reason the new nut overwrites `modified`. we'll let this function do that
      $.extend(this.store[id], nut); // modifies in place

      this.nutUpdated(id);
    },
    deleteNut: function(id) { // TODO test
      // TODO
      // remove from store, index, and tags, change tag modified
    },

    // call whenever a nut is updated
    // 1: updates `modified`
    // 2: updates lunr index
    // NOTE: we're not updating history here, see note on updateNut()
    nutUpdated: function(id) {
      this.store[id].modified = (new Date).getTime()
      this.saveData();
      this.updateNutInIndex(id);
    },

    updateNutInIndex: function(id) {
      // update just does `remove` then `add` - seems to be fine that this gets called even when it's a totally new nut
      this.index.update({
        id: id,
        body: this.store[id].body,
        tags: this.store[id].tags.map(function(i){ return nm.tags[i].name; }).join(" ")
      });
    }

  };

  $s.n.sortBy = $s.n.sortOpts[0]; // set initial value for nut sort select dropdown


  // TAG STUFF

  $s.t = {
    tags: [],

    sortOpts: [
      {field: "docs.length", rev: true, name: "Most used"},
      {field: "docs.length", rev: false, name: "Least used"},
      {field: "modified", rev: true, name: "Recently modified"},
      {field: "modified", rev: false, name: "Oldest modified"},
      {field: "created", rev: true, name: "Recently created"},
      {field: "created", rev: false, name: "Oldest created"},
      {field: "name", rev: false, name: "Alphabetically"},
      {field: "name", rev: true, name: "Alpha (reversed)"}
    ],

    /* 
     * merge passed tag with defaults and store it (right now actually just takes tag name)
     * TODO: random generate pleasing colors somehow (distribute evenly across spectrum?)
     * TODO: check for duplicate names
     * TODO: if `docs` exists, go through and add to each nut
     */
    createTag: function(tag) {
      if (!tag.name) {
        console.error("Attempted to add tag with no name. Tried to add:");
        console.error(tag);
        return -1;
      }
      var newId = this.tags.push(_.defaults(tag, {
        docs: [], // array of doc ids that have this
        created: (new Date).getTime(),
        modified: (new Date).getTime(),
        color: "white", // # or css color
        bgColor: "black"
      })) - 1; // newId is return val of push()-1 cause push returns new length
      // nm.tagUpdated(newId);
      this.createTagName = ""; // clear input
      this.creatingTag = false; // hide input
      return newId;
    },

    createTags: function(tags){
      var self = this;
      tags.forEach(function(tag) {
        self.createTag(tag);
      });
    },

    // return -1 if not found
    // TODO gotta be a better way than looping through the whole thing. keep a reverse index?
    getTagIdByName: function(name) {
      for (var i = this.tags.length - 1; i >= 0; i--) {
        if (name === this.tags[i].name ) {
          return i;
        }
      };
      return -1;
    }

  };

  $s.t.sortBy = $s.t.sortOpts[0]; // set initial value for tag sort select dropdown

  $s.t.createTags([{name: "Turkey"},{name: "steampunk"},{name: "quote"},{name: "education"},{name: "observation"}]);
  $s.n.createNuts([{
    body: "'everyone saves the country in their own way' rough translation from turkish, part of raki culture",
    tags: [0,2]
  }, {
    body: "Suddenly I realized that the music had been replaced with—had descended into—the plaintive beeps of a truck reversing outside. I hadn't noticed the transition.",
    tags:[4]
  }, {
    body: "At a good teaching school, a professor is expected to run the class and, sometimes, have a small group of students over to his house for dinner. As the former function becomes less important, due to competition from online content, the latter function will predominate. The computer program cannot host a chatty, informal dinner in the same manner. We could think of the forthcoming educational model as professor as impresario. In some important ways, we would be returning to the original model of face-to-face education as practiced in ancient Greek symposia and meetings by the agora.\n\nIt will become increasingly apparent how much of current education is driven by human weakness, namely the inability of most students to simply sit down and try to learn something on their own. **It’s a common claim that you can’t replace professors with Nobel-quality YouTube lectures, because the professor, and perhaps also the classroom setting, is required to motivate most of the students. Fair enough, but let’s take this seriously. The professor is then a motivator first and foremost.** Let’s hire good motivators. Let’s teach our professors how to motivate. Let’s judge them on that basis. Let’s treat professors more like athletics coaches, personal therapists, and preachers, because that is what they will evolve to be.\n\nFrom Average Is Over: Powering America Beyond the Age of the Great Stagnation, by Tyler Cowen (emphasis mine)",
    tags: [2,3]
  },
  {
    body: 'nonsensenyc steampunk event from "Gemini and Scorpio": "Lost Circus dress code: dark cabaret, traveling circus, steampunk Victorian, neo-tribal, funky formal, desert wanderer, Edward Gorey, Tim Burton, Mad Max, City of Lost Children. Effort required. Stilts and characters welcome."',
    tags: [1,2]
  },
  {
    body: "**What did it feel like in the moments after you got your diagnosis?**\n\nIt was a little dizzying, partly because I’d expected to just be in and out of the place, and suddenly they were pulling out the hypodermics and tourniquets to do a confirmatory blood test, and I felt like I was going crazy because I’d given them a pseudonym and they were all calling me Mark.\n\n**Why a pseudonym?**\n\nBush-era paranoia. I didn’t want to link myself to my diagnosis. So they’re like “MARK, WHAT DO YOU WANT TO DO,” and the fluorescent lights are flickering above me and I’ve got super low blood sugar because I’d meant to get food immediately after, and now all these people with needles are staring at me, going “MARK. MARK,” and I was like, “I’m going to leave right now.” I didn’t have any pockets, and I had all of these pills and paperwork and walked out with three things in each hand, and it was so bright outside…\n\nThere was this hyper-real moment on the street. I’d gotten a parking ticket and that’s what made me shed my first tear. And afterwards I couldn’t decide what to do, get food or go to work or what, and I was sort of doing pirouettes on the crosswalk of this sun-drenched intersection, looking back and forth between the clinic and my car, and this girl was watching me and I finally locked eyes with her. It was the most intense eye contact I’ve ever had with a stranger. We were just staring at each other for a full minute, and she sort of wordlessly acknowledged, “You are having a fucking day right now.”\n\nexcerpt from The Sexual History of Jared Sabbagh, Part 3 http://thehairpin.com/2013/09/jared#more",
    tags:[2]
  }]);

}]) // end of Nutmeg controller
.directive('myCustomer', function() {
  return {
    template: 'Name: {{customer.name}} Address: {{customer.address}}'
  };
});

// ==== RANDOM GLOBAL UTILITIES ==== //

function defaultFor(arg, val) {
  return typeof arg !== 'undefined' ? arg : val;
}