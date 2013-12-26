"use strict";

// https://github.com/andyet/ConsoleDummy.js
(function(b){function c(){}for(var d="error,group,groupCollapsed,groupEnd,log,time,timeEnd,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});

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

var ngApp = angular.module('nutmeg', [])
.controller('Nutmeg', ['$scope', '$timeout', function($s, $timeout) {

  $s.m = { modal: false };

  // keeps track of changes. nuts and tags will map from id to object
  $s.digest = {
    reset: function() {
      this.config = {};
      this.nuts = {};
      this.tags = {};
      this.status = 'synced';
    },
    push: function() {
      this.status = 'syncing';
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
    loading: false, // when true, "go" button for login and createaccount is replaced with loading spinner

    createAccount: function(email, pass1, pass2) {
      console.log("createAccount() called");
      if ($s.u.loading) return;

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

      $s.u.loading = true;
      $s.u.auth.createUser(email, pass1, function(error, user) {
        if (!error) {
          console.log('New account made: user id ' + user.id + ', email ' + user.email);
          $s.u.login(email, pass1, true);
        }
        else {
          alert("Error creating account: " + JSON.stringify(error));
          $s.u.loading = false;
        }
      });
    },

    login: function(email, password, calledFromCreateAccount) {
      console.log("login() called")
      if (!calledFromCreateAccount && $s.u.loading) return;

      $s.u.loading = true;
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
        $s.u.loading = false; // so that they get the button back and can try again
        $s.$apply();
      }
      else if (user) {
        // user authenticated with Firebase
        console.log('Logged in, user id: ' + user.id + ', provider: ' + user.provider);
        $s.u.user = user;
        init(user.uid, function() {
          console.log("init callback")
          $timeout($s.n.autosizeAllNuts, 0);
          $s.m.modal = false;
          $s.u.loggedIn = true;
          $s.u.loading = false; // used for login/createaccount loading spinner
          $s.$apply();
        });
      }
      else {
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
    maxHistory: 1, // how many revisions of each nut to save. 1 is minimum - we need it in nutBodyUpdated
    tagChangesChangeNutModifiedTimestamp: false
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

      $timeout($s.n.autosizeAllNuts, 0);

      return newId;
    },
    createNuts: function(nuts){
      nuts.forEach(function(nut) {
        $s.n.createNut(nut);
      });
    },

    deleteNut: function(nut) {
      if (!confirm("Are you sure you want to delete this note? This can't be undone.")) {
        return;
      }

      // keep tag docs consistent
      // see comment on deleteTag() for why we need slice()
      if (nut.tags) {
        nut.tags.slice().forEach(function(tagId) {
          $s.n.removeTagIdFromNut(tagId, nut.id);
        });
      }

      this.removeNutFromIndex(nut);

      delete this.nuts[nut.id];

      $s.digest.nuts[nut.id] = null;
      $s.digest.push(); // update right away

      $timeout($s.n.autosizeAllNuts, 0);

      console.log("nut "+nut.id+" has been deleted");
    },

    /* call whenever a nut is updated
     * can accept nut id OR nut
     * is called, for instance, via nutBodyUpdated when textarea blurs or when tags added/removed
     * 1: updates history. NOTE: we store entire state of nut in each history entry. could instead store just changes if this gets to big. NOTE 2: by the time this is called, the view and model have already changed. we are actually storing the CHANGED version in history.
     * 2: updates `modified` (default - pass false in as second param to disable)
     * 3: updates lunr index
     * 4: adds to digest to be saved to firebase
     */
    nutUpdated: function(nut, updateModified) {
      updateModified = defaultFor(updateModified, true);

      $s.digest.status = 'unsynced';

      if (typeof nut == "number") {
        nut = $s.n.nuts[nut];
      }

      var oldState = $.extend(true, {}, nut); // deep clone ourself
      delete oldState.history; // no need for the history to have history
      nut.history.push(oldState); // append ourselves into history
      if (nut.history.length > $s.config.maxHistory) {
        nut.history.shift(); // chuck the oldest one
      }

      if (updateModified) {
        nut.modified = (new Date).getTime()
      }

      $s.digest.nuts[nut.id] = nut;
      // $s.digest.push(); // don't update right away. sometimes nutUpdated() can be called multiple times during one operation

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
        tags: nut.tags ? nut.tags.map(function(i){ return $s.t.tags[i].name; }).join(" ") : ""
      });
    },

    removeNutFromIndex: function(nut) {
      $s.lunr.remove({
        id: nut.id
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
      }
      // add nut id to tag if it's not already there
      if (!$s.t.tags[tagId].docs) $s.t.tags[tagId].docs = []; // firebase doesn't store empty arrays/objects, so create it here
      if ($s.t.tags[tagId].docs.indexOf(nutId) === -1 ) {
        $s.t.tags[tagId].docs.push(nutId);
      }

      this.nutUpdated(nutId, $s.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
      $s.t.tagUpdated(tagId);
    },
    removeTagIdFromNut: function(tagId, nutId) {
      console.log("removing tag "+tagId+" from nut "+nutId);
      // remove tag id from nut (check it's there first so we don't splice out -1)
      if ($s.n.nuts[nutId].tags.indexOf(tagId) !== -1 ) {
        $s.n.nuts[nutId].tags.splice($s.n.nuts[nutId].tags.indexOf(tagId), 1);
      }
      // you get it
      if ($s.t.tags[tagId].docs.indexOf(nutId) !== -1 ) {
        $s.t.tags[tagId].docs.splice($s.t.tags[tagId].docs.indexOf(nutId), 1);
      }

      this.nutUpdated(nutId, $s.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
      $s.t.tagUpdated(tagId);
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
      $timeout($s.n.autosizeAllNuts, 0);
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
        if (this.tags[i] && name === this.tags[i].name ) {
          return i;
        }
      };
      return -1;
    },

    deleteTag: function(tag) {
      if (!confirm('Are you sure you want to delete the tag "'+tag.name+'"? This can\'t be undone.')) {
        return;
      }

      // tag.docs.slice() returns a duplicate of the array. necessary, because removeTagIdFromNut() splices tag.docs - if we splice out stuff while iterating over it with forEach, we won't iterate over them all
      if (tag.docs) {
        tag.docs.slice().forEach(function(docId) {
          $s.n.removeTagIdFromNut(tag.id, docId);
        });
      }

      delete this.tags[tag.id];

      $s.digest.tags[tag.id] = null;
      $s.digest.push(); // update right away

      console.log("tag "+tag.id+" ("+tag.name+") has been deleted");
    },

    editTag: function(tag) {
      var newName = prompt("Enter a new name for this tag");
      if (newName) {
        tag.name = newName;
        $s.digest.tags[tag.id] = tag;
        console.log("tag "+tag.id+"'s name updated to "+tag.name);
      }
    },

    /* call whenever a tag is updated
     * 1: updates `modified`
     * 2: TODO: updateNutInIndex() too, but only if name changed? when added/removed from nut, nutUpdated() gets called which will reindex those nuts. need to have convention of where index gets updated when tag entirely deleted
     * 3: add to digest
     */
    tagUpdated: function(id) {
      $s.digest.status = 'unsynced';
      console.log("tag "+id+" has been updated")
      this.tags[id].modified = (new Date).getTime();
      $s.digest.tags[id] = this.tags[id];
    }

  };

  $s.t.sortBy = $s.t.sortOpts[0]; // set initial value for tag sort select dropdown

  function init(uid, cb) {
    console.log("init: fetching data for user uid "+uid)
    $s.ref = new Firebase('https://nutmeg.firebaseio.com/users/' + uid);

    $s.ref.once('value', function(data) {
      if (data.val() === null) {
        console.log("init: new user - initializing with dummy data");
        // must be a new user - even if existing user deleted everything there would still be object with config and empty nuts/tags
        firstInit();
        $s.digest.push();
      }
      else {
        console.log("init: fetched user data");
        // under some conditions (no 0th index?) firebase returns objects
        // need arrays in order to do push and length etc. also IIRC arrays made ng-repeat easier?
        // arrayFromObj also ensures that even if the value is undefined, we get back []
        $s.n.nuts = data.val().nuts instanceof Array ? data.val().nuts : arrayFromObj(data.val().nuts);
        $s.t.tags = data.val().tags instanceof Array ? data.val().tags : arrayFromObj(data.val().tags);
        $s.n.nuts.forEach($s.n.updateNutInIndex);
      }

      // sync to server every 5s
      // if there are no changes this does nothing, so that's fine
      $s.u.digestInterval = window.setInterval($s.digest.push, 5000);
      window.beforeunload = $s.digest.push; // TODO since push() isn't synchronous, probably won't work. TODO: check if there is an issue with "this"

      cb();
    });

    // TODO also put child add/changed/removed on nuts config and tags? or does it work on entire ref?

  }

  function firstInit() {
    $s.n.nuts = [];
    $s.t.tags = [];

    // load dummy data
    $s.t.createTags([{name: "Turkey"},{name: "futurism"},{name: "quote"},{name: "education"}]);
    $s.n.createNuts([{
      body: "'everyone saves the country in their own way' rough translation from turkish, part of raki culture",
      tags: [0,2]
    }, {
      body: "At a good teaching school, a professor is expected to run the class and, sometimes, have a small group of students over to his house for dinner. As the former function becomes less important, due to competition from online content, the latter function will predominate. The computer program cannot host a chatty, informal dinner in the same manner. We could think of the forthcoming educational model as professor as impresario. In some important ways, we would be returning to the original model of face-to-face education as practiced in ancient Greek symposia and meetings by the agora.\n\nIt will become increasingly apparent how much of current education is driven by human weakness, namely the inability of most students to simply sit down and try to learn something on their own. **It’s a common claim that you can’t replace professors with Nobel-quality YouTube lectures, because the professor, and perhaps also the classroom setting, is required to motivate most of the students. Fair enough, but let’s take this seriously. The professor is then a motivator first and foremost.** Let’s hire good motivators. Let’s teach our professors how to motivate. Let’s judge them on that basis. Let’s treat professors more like athletics coaches, personal therapists, and preachers, because that is what they will evolve to be.\n\nFrom Average Is Over: Powering America Beyond the Age of the Great Stagnation, by Tyler Cowen (emphasis mine)",
      tags: [2,3]
    },
    {
      body: "**What did it feel like in the moments after you got your diagnosis?**\n\nIt was a little dizzying, partly because I’d expected to just be in and out of the place, and suddenly they were pulling out the hypodermics and tourniquets to do a confirmatory blood test, and I felt like I was going crazy because I’d given them a pseudonym and they were all calling me Mark.\n\n**Why a pseudonym?**\n\nBush-era paranoia. I didn’t want to link myself to my diagnosis. So they’re like “MARK, WHAT DO YOU WANT TO DO,” and the fluorescent lights are flickering above me and I’ve got super low blood sugar because I’d meant to get food immediately after, and now all these people with needles are staring at me, going “MARK. MARK,” and I was like, “I’m going to leave right now.” I didn’t have any pockets, and I had all of these pills and paperwork and walked out with three things in each hand, and it was so bright outside…\n\nThere was this hyper-real moment on the street. I’d gotten a parking ticket and that’s what made me shed my first tear. And afterwards I couldn’t decide what to do, get food or go to work or what, and I was sort of doing pirouettes on the crosswalk of this sun-drenched intersection, looking back and forth between the clinic and my car, and this girl was watching me and I finally locked eyes with her. It was the most intense eye contact I’ve ever had with a stranger. We were just staring at each other for a full minute, and she sort of wordlessly acknowledged, “You are having a fucking day right now.”\n\nexcerpt from The Sexual History of Jared Sabbagh, Part 3 http://thehairpin.com/2013/09/jared#more",
      tags:[2]
    },
    {
      body: "There are six people living in space right now. There are people printing prototypes of human organs, and people printing nanowire tissue that will bond with human flesh and the human electrical system.\n\nWe’ve photographed the shadow of a single atom. We’ve got robot legs controlled by brainwaves. Explorers have just stood in the deepest unsubmerged place in the world, a cave more than two kilometres under Abkhazia. NASA are getting ready to launch three satellites the size of coffee mugs, that will be controllable by mobile phone apps.\n\nHere’s another angle on vintage space: Voyager 1 is more than 11 billion miles away, and it’s run off 64K of computing power and an eight-track tape deck.\n\nThe most basic mobile phone is in fact a communications device that shames all of science fiction, all the wrist radios and handheld communicators. Captain Kirk had to tune his fucking communicator and it couldn’t text or take a photo that he could stick a nice Polaroid filter on. Science fiction didn’t see the mobile phone coming. It certainly didn’t see the glowing glass windows many of us carry now, where we make amazing things happen by pointing at it with our fingers like goddamn wizards.\n\n...The central metaphor is magic. And perhaps magic seems an odd thing to bring up here, but magic and fiction are deeply entangled, and you are all now present at a séance for the future.\n\n- Warren Ellis, How to see the Future (http://www.warrenellis.com/?p=14314)",
      tags: [1,2]
    },
    {
      body: "Welcome to Nutmeg. Here are some dummy notes to get you started. You can delete them by hitting the trash can in the top right of each note. In the menu in the lower right corner of the screen you can submit any bug reports, suggestions, or thoughts as feeback. Please do!"
    }]);
  }

  $s.submitFeedback = function(feedback, name) {
    console.log("calling submitFeedback()");
    if (!feedback) {
      alert("You forgot to enter any feedback.");
      return false;
    }

    new Firebase('https://nutmeg.firebaseio.com/feedback/').push({
      'feedback': feedback,
      'name': name || null,
      'email': $s.u.user.email
    }, function(err) {
      if (err) console.log(err);
      console.log("feedback submitted and synced to Firebase");
    });

    alert("Thanks!");
    return true;
  };

  // handy for accessing and playing with things from console while debugging
  window.nmScope = angular.element(document.getElementsByTagName("body")[0]).scope();

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

// expects object with only numerical indices
// creates a sparse array that preserves those indices
// always returns at least an empty array
function arrayFromObj(obj) {
  if (!obj) return [];
  var arr = [];
  angular.forEach(obj, function(value, key) {
    arr[key] = value; // discards non-numerical keys
  });
  return arr;
}