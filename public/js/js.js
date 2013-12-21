"use strict";

// https://github.com/andyet/ConsoleDummy.js
(function(b){function c(){}for(var d="error,group,groupCollapsed,groupEnd,log,time,timeEnd,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});

/*

var h = angular.element(".circle div")[2].scrollHeight
angular.element(".circle div")[2].style['margin-top'] = "-86px"

### DO NOW

- disable go button on click
- feedback form
- figure out why digest.push() doesn't work on nut blur
- when you click on a nut tag, prepend it to the query?
- create account by invite only + 'request invite' button
- permissions for reading nuts
- right now, a note is only saved after you click outside of the textarea. that means if you're typing something and directly close the window, you'll lose changes
- sync status icon

### DO SOON

- delete tag (confirm)
- delete nut
- shortcuts
  - new nut
  - new tag on nut
  - new tag
  - ctrl+l move to query bar
  - verify tab goes between textareas in other browsers
- implement sort by query match strength

*/

var oldUnusedFuncs = {
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
  }
};

var saveInterval; // window.setInterval timer for saving
var nutDiff; // stores body of nut to check if it's changed - only saves if it has

$(function() { // upon DOM having loaded

  // focus events: when you focus on a nut, start autosaving until you unfocus

/*
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

  $("#nuts").on("keydown", "textarea", nm.face.autosizeNut);
  */

  // ==== AUTOCOMPLETE ==== //

  /*
  // TODO store this better and auto update with tags updating
  $( "#query input" ).autocomplete({
    source: _.map(nm.tags, function(tag) { return tag.name; })
  });
  */

});

// ANGULARFIRE

// access this shit from outside scope
// angular.element($("body")).scope().t.tags.push({name:"foooo"})
// angular.element($("body")).scope().$apply()

var ngApp = angular.module('nutmeg', [])
.controller('Nutmeg', ['$scope', function($s) {

  $s.m = { modal: false };

  // keeps track of changes. nuts and tags will map from id to object
  $s.digest = {
    reset: function() {
      this.config = {};
      this.nuts = {};
      this.tags = {};
    },
    push: function() {
      // note: this is called from various places - we can't rely on 'this' so use $s.digest
      console.log("digest: checking for changes to push");
      var updated = false;
      ['config', 'nuts', 'tags'].map(function(field) {
        if (Object.keys($s.digest[field]).length != 0) {
          $s.ref.child(field).update(angular.copy($s.digest[field]));
          updated = true;
        }
      });

      if (updated) {
        console.log("digest: changes found, pushing");
      }
      // TODO: onComplete callback after both to say push successful - this only called after sync to servers: https://www.firebase.com/docs/javascript/firebase/update.html
      $s.digest.reset();
    }
  }
  $s.digest.reset(); // also initializes

  // user authentication
  $s.u = {
    loggedIn: false,

    createAccount: function(email, pass1, pass2) {
      if (pass1 != pass2) {
        alert("Passwords don't match!");
        return;
      }
      if (!email) {
        alert("You didn't enter an email address!");
        return;
      }
      if (!pass1) {
        alert("You didn't enter a password!");
        return;
      }
      $s.u.auth.createUser(email, pass1, function(error, user) {
        if (!error) {
          console.log('New account made: user id ' + user.id + ', email ' + user.email);
          $s.u.login(email, pass1);
        }
        else {
          alert("Error creating account: " + JSON.stringify(error));
        }
      });
    },

    login: function(email, password) {
      $s.u.auth.login('password', {
        'email': email,
        'password': password,
        'rememberMe': true
      });
    },

    auth: new FirebaseSimpleLogin(new Firebase('https://nutmeg.firebaseio.com/'), function(error, user) {
      if (error) {
        // an error occurred while attempting login
        alert("Error logging in: " + JSON.stringify(error));
      } else if (user) {
        // user authenticated with Firebase
        console.log('Logged in, user id: ' + user.id + ', provider: ' + user.provider);
        $s.u.user = user;
        init(user.uid, function() {
          $s.$apply();
          $s.n.autosizeAllNuts();
          $s.m.modal = false;
          $s.u.loggedIn = true;
        });
      } else {
        // user is logged out
        console.log("Logged out");
        $s.u.user = undefined;
        window.clearInterval($s.u.digestInterval);
        $s.u.loggedIn = false;
        $s.m.modal = 'login';
        $s.$apply();
      }
    })
  };

  $s.config = {
    maxHistory: 20 // how many revisions of each nut to save
  };

  $s.lunr = lunr(function () {
    // this.field('title', {boost: 10});
    this.field('tags', {boost: 100});
    this.field('body', {boost: 1});
    this.ref('id');
  });

  // ==== NUT FUNCTIONS ==== //
  /*
       d8b   db db    db d888888b   d88888b db    db d8b   db  .o88b. .d8888. 
       888o  88 88    88 `~~88~~'   88'     88    88 888o  88 d8P  Y8 88'  YP 
       88V8o 88 88    88    88      88ooo   88    88 88V8o 88 8P      `8bo.   
C8888D 88 V8o88 88    88    88      88~~~   88    88 88 V8o88 8b        `Y8b. 
       88  V888 88b  d88    88      88      88b  d88 88  V888 Y8b  d8 db   8D 
       VP   V8P ~Y8888P'    YP      YP      ~Y8888P' VP   V8P  `Y88P' `8888Y'
  */

  $s.n = {
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

      this.nutUpdated(newId); // saves state in history, updates index, etc.
      console.log("new nut "+newId+" has been created");

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
        var tagId = $s.t.getTagIdByName(tagName);

        if (tagId === -1) {
          console.log("creating new tag " + tagName);
          tagId = $s.t.createTag({name: tagName});
        }

        if (!nut.tags) nut.tags = []; // firebase doesn't store empty arrays/objects, so create it here
        if (nut.tags.indexOf(parseInt(tagId)) !== -1) {
          console.log("tag "+tagName+" already exists on nut "+nut.id);
        }
        else {
          this.addTagIdToNut(tagId, nut.id);
        }
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
      if (!$s.t.tags[tagId].docs) $s.t.tags[tagId].docs = []; // firebase doesn't store empty arrays/objects, so create it here
      if ($s.t.tags[tagId].docs.indexOf(nutId) === -1 ) {
        $s.t.tags[tagId].docs.push(nutId);
        $s.t.tags[tagId].modified = (new Date).getTime();
      }
      $s.t.tags[tagId].modified = (new Date).getTime();

      this.nutUpdated(nutId); // update history, modified, index
      $s.t.tagUpdated(tagId);
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

      this.nutUpdated(nutId); // update history, modified, index
      $s.t.tagUpdated(tagId);
    },

    /*
     */
    updateNut: function(id, nut) {
    },
    deleteNut: function(id) { // TODO test
      // TODO
      // remove from store, index, and tags, change tag modified
    },

    /* call whenever a nut is updated
     * can accept nut id OR nut
     * is called, for instance, when textarea blurs or when tags added/removed
     * 1: updates history. NOTE: we store entire state of nut in each history entry. could instead store just changes if this gets to big. NOTE 2: by the time this is called, the view and model have already changed. we are actually storing the CHANGED version in history.
     * 2: updates `modified`
     * 3: updates lunr index
     * 4: adds to digest to be saved to firebase
     */
    nutUpdated: function(nut) {
      if (typeof nut == "number") {
        nut = $s.n.nuts[nut];
      }

      var oldState = $.extend(true, {}, nut); // deep clone ourself
      delete oldState.history; // no need for the history to have history
      nut.history.push(oldState); // append ourselves into history
      if (nut.history.length > $s.config.maxHistory) {
        nut.history.shift(); // chuck the oldest one
      }

      nut.modified = (new Date).getTime()

      $s.digest.nuts[nut.id] = nut;
      $s.digest.push();

      this.updateNutInIndex(nut);

      console.log("nut "+nut.id+" has been updated");
    },

    nutBodyUpdated: function(nut) {
      if (nut.body == nut.history[nut.history.length-1].body) {
        console.log("nut "+nut.id+" lost focus but unchanged");
      }
      else {
        this.nutUpdated(nut);
      }
    },

    updateNutInIndex: function(nut) {
      // update just does `remove` then `add` - seems to be fine that this gets called even when it's a totally new nut
      $s.lunr.update({
        id: nut.id,
        body: nut.body,
        tags: nut.tags.map(function(i){ return $s.t.tags[i].name; }).join(" ")
      });
    },

    autosizeAllNuts: function() {
      angular.element(".nut textarea").each(function(i, ta){
        $s.n.autosizeNut(ta);
      });
    },

    autosizeNut: function(el) {
      el.style.height = "";
      el.style.height = el.scrollHeight + 'px';
    }

  };

  $s.n.sortBy = $s.n.sortOpts[0]; // set initial value for nut sort select dropdown

  // ==== QUERY STUFF ==== //

  $s.q = {
    showAll: true,
    query: "", // modeled in query bar and watched for changes by nmQuery directive, which calls doQuery()

    // TODO tag autocomplete should start with 1 keypress and be sorted by most used (configurable?)
    doQuery: function(query) {
      console.log("queried \""+query+"\"");
      // only start live searching once 3 chars have been entered
      if (query.length > 2) {
        var results = $s.lunr.search(query); // by default ANDs spaces: "foo bar" will search foo AND bar
        // results is array of objects each containing `ref` and `score`
        // ignoring score for now
        this.showAll = false;
        this.showNuts = results.map(function(doc){ return parseInt(doc.ref); }); // gives us an array
      }
      else {
        // go back to show all
        this.showAll = true;
      }
    }
  }; // end of $s.q

  // ==== TAG FUNCTIONS ==== //
  /*
       d888888b  .d8b.   d888b    d88888b db    db d8b   db  .o88b. .d8888. 
       `~~88~~' d8' `8b 88' Y8b   88'     88    88 888o  88 d8P  Y8 88'  YP 
          88    88ooo88 88        88ooo   88    88 88V8o 88 8P      `8bo.   
C8888D    88    88~~~88 88  ooo   88~~~   88    88 88 V8o88 8b        `Y8b. 
          88    88   88 88. ~8~   88      88b  d88 88  V888 Y8b  d8 db   8D 
          YP    YP   YP  Y888P    YP      ~Y8888P' VP   V8P  `Y88P' `8888Y'
  */


  // TAG STUFF

  $s.t = {
    tags: [],

    sortOpts: [
      {field: "docs.length", rev: true, name: "Most used"}, // TODO firebase doesn't store empty arrays, so docs.length is undefined for unused tags. hacked to dispay (0) anyway but sort is off. maybe if dropdown switches to one of these then scan through all tags and fix? would pulling changes from firebase then obliterate?
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
      var newId = this.tags.length; // will be index of new nut
      this.tags.push(_.defaults(tag, {
        docs: [], // array of doc ids that have this
        created: (new Date).getTime(),
        modified: (new Date).getTime(),
        color: "white", // # or css color
        bgColor: "black",
        id: newId
      }));
      this.tagUpdated(newId);
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
    },

    /* probably to change name or color
     * TODO this may be unnecessary with data binding + tagUpdated()
     */
    updateTag: function(id, tag) {
      return; // TODO
      // any new values will overwrite the old:
      this.tags[id] = $.extend(this.tags[id], tag);
      this.tagUpdated(id);
    },

    deleteTag: function(id) {
      return; // TODO
      // TODO
      // go through each doc id and splice it out
      // remove from firebase
      this.tagUpdated(id);
    },

    /* call whenever a tag is updated
     * if this.tags[id] is undefined, this means it was deleted
     * 1: updates `modified` (unless was deleted)
     * 2: TODO: updateNutInIndex() too, but only if name changed or deleted? when added/removed from nut, nutUpdated() gets called which will reindex those nuts. need to have convention of where index gets updated when tag entirely deleted
     * 3: add to digest
     */
    tagUpdated: function(id) {
      console.log("tag "+id+" has been updated")
      if (this.tags[id]) {
        this.tags[id].modified = (new Date).getTime();
        $s.digest.tags[id] = this.tags[id];
      }
      else {
        // was deleted
        console.log("tag "+id+" was deleted actually")
        $s.digest.tags[id] = null;
      }
      $s.digest.push();
    },

  };

  $s.t.sortBy = $s.t.sortOpts[0]; // set initial value for tag sort select dropdown

  function init(uid, cb) {
    console.log("fetching data for user uid "+uid)
    $s.ref = new Firebase('https://nutmeg.firebaseio.com/users/' + uid);

    $s.ref.once('value', function(data) {
      if (data.val() === null) {
        console.log("new user - initializing with dummy data");
        // must be a new user - even if existing user deleted everything there would still be object with config and empty nuts/tags
        dummyInit();
        $s.digest.push();
      }
      else {
        console.log("fetched user data");
        $s.n.nuts = data.val().nuts;
        $s.t.tags = data.val().tags;
      }

      // sync to server every 5s
      // if there are no changes this does nothing, so that's fine
      $s.u.digestInterval = window.setInterval($s.digest.push, 5000);
      window.beforeunload = $s.digest.push; // TODO since push() isn't synchronous, probably won't work. TODO: check if there is an issue with "this"

      cb();
    });

    // TODO also put child add/changed/removed on nuts config and tags? or does it work on entire ref?

  }

  function dummyInit() {
    $s.n.nuts = [];
    $s.t.tags = [];

    // load dummy data
    $s.t.createTags([{name: "Turkey"},{name: "steampunk"},{name: "quote"},{name: "education"},{name: "observation"}]);
    $s.n.createNuts([{
      body: "'everyone saves the country in their own way' rough translation from turkish, part of raki culture",
      tags: [0,2,4]
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
    },
    {
      body: "Here you have some dummy notes to get you started. Sorry, you can't delete notes yet but you'll be able to soon."
    }]);
  }


}]) // end of Nutmeg controller
.directive('nmFocus', function($timeout) {
  return function(scope, element, attrs) {
     scope.$watch(attrs.nmFocus, function (newValue) {
        // not sure why $timeout is necessary here, but seems like otherwise input gets focus BEFORE ng-show on parent <li> kicks in
        $timeout(function() {
          newValue && element[0].focus()
        }, 0);
     });
  };
})
.directive('nmQuery', function() {
  return function(scope, element, attrs) {
    scope.$watch(attrs.nmQuery, function(newQ) {
      // TODO: hack, i don't understand angular enough to do this properly. use a service?
      angular.element($("body")).scope().q.doQuery(newQ);
    });
  };
});

// ==== RANDOM GLOBAL UTILITIES ==== //

function defaultFor(arg, val) {
  return typeof arg !== 'undefined' ? arg : val;
}