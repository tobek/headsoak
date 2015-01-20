/* jshint ignore:start */ // TODO actually clean up
"use strict";

// https://github.com/andyet/ConsoleDummy.js
(function(b){function c(){}for(var d="error,group,groupCollapsed,groupEnd,log,time,timeEnd,warn".split(","),a;a=d.pop();)b[a]=b[a]||c})(window.console=window.console||{});

angular.module('nutmeg', ['fuzzyMatchSorter'])
.controller('Nutmeg', ['$scope', '$timeout', "$interval", "$sce", "fuzzyMatchSort", function ($s, $timeout, $interval, $sce, fuzzyMatchSort) {

  // when adding tags to a note, option to create a new tag with the currently-entered text will appear above any suggestions with a score worse (great) than this threshold
  var NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD = 5;

  var PROG_TAG_EXAMPLES = [
    '// return true if note should contain tag "TAGNAME". example:\n\nif (note.body.indexOf("TAGNAME") !== -1) {\n  return true;\n}\nelse {\n  return false;\n}',
    '// return true if note should contain tag \"TAGNAME\". example: programmatically create a general \"nutmeg\" parent tag.\n\n// let\'s also use some lo-dash/underscore\n\nvar noteTagNames = _.map(note.tags, function(tagId) {\n  return getTagNameById(tagId);\n});\n\nvar nutmegTags = ["nutmeg bugs", "nutmeg features", "nutmeg faq", "nutmeg shortcodes", "nutmeg inspiration"];\n\nvar intersection = _.intersection(nutmegTags, noteTagNames);\n\nif (intersection.length) {\n  return true;\n}\nelse {\n  return false;\n}',
    '// return true if note should contain tag "TAGNAME". example: programmatically tag untagged notes\n\nif (note.tags.length === 0) {\n  return true;\n}\nelse if (note.tags.length === 1 && note.tags[0] === this.id) {\n  // note has only one tag and it\'s this one!\n  return true;\n}\nelse {\n  return false;\n}'
  ];
  var PROG_TAG_INFO = '\n/**\n * example `note` argument:\n *\n * {\n *   id: 42, // won\'t change\n *   body: "the text of the note...",\n *   created: 1420250076086,\n *   modified: 1420250076108,\n *   private: false,\n *   tags: [3, 12, 35] // tag IDs\n * }\n *\n * also in scope:\n * \n * - this: the current tag object, e.g. {id: 17, name: the tag\'s name"}\n * - getTagNameById(id): function returning tag name from tag ID\n * - _: lo-dash library\n *\n */';

  var SAMPLE_DISPLAY_NAMES = ['Napoléon Bonaparte', 'Marco Polo', 'Nikola Tesla', 'Edgar Allan Poe', 'Florence Nightingale', 'Marilyn Monroe', 'Joan of Arc', 'Catherine the Great', 'Vlad the Impaler'];


  $s._ = _; // make lodash available to view template

  $s.m = {
    modal: false,
    modalLarge: false,

    /** user has accepted or completed modal */
    finishModal: function() {
      if ($s.m.dynamic) {
        if ($s.m.dynamic.editor) {
          // pass editor value back to callback:
          $s.m.dynamic.okCb($s.m.dynamic.editor.getValue());
        }
        else if ($s.m.dynamic.okCb) {
          // call the callback with whatever arguments were passed in to finishModal()
          $s.m.dynamic.okCb.apply(null, arguments);
        }
      }

      if ($s.m.dynamic && $s.m.dynamic.dontCloseOnOk) {
        return;
      }
      else {
        $s.m.closeModal();      
      }
    },
    cancelModal: function() {
      if ($s.m.dynamic && $s.m.dynamic.cancelCb) {
        $s.m.dynamic.cancelCb();
      }

      $s.m.closeModal();      
    },
    closeModal: function() {
      // only close modal if logged in - otherwise we're closing the login window on a blank screen:
      if (! $s.u.loggedIn) return;

      // we can make the modal lock the user out:
      if ($s.m.lockedOut) return;

      if ($s.m.dynamic) {
        if ($s.m.dynamic.editor) {
          $s.m.dynamic.editor.destroy(); // doesn't seem to be doing anything?
        }

        delete $s.m.dynamic;
      }

      $timeout(function() {
        $s.m.working = false;
        $s.m.modal = false;
        $s.m.modalLarge = false;
      });
    },

    /** pass in string to display to user, or object with various options */
    alert: function(opts) {
      if (typeof opts === 'string') {
        opts = {message: opts};
      }

      $timeout(function() {
        $s.m.modal = "dynamic";
        $s.m.dynamic = {
          title: opts.title,
          message: opts.message,
          bodyHTML: $sce.trustAsHtml(opts.bodyHTML),
          ok: opts.ok !== false, // show okay unless explicitly set to false
          okText: opts.okText,
          okCb: opts.okCb,
          cancel: opts.cancel || !! opts.cancelText, // angular template interprets "no" as falsey so we have to do this...
          cancelText: opts.cancelText,
          cancelCb: opts.cancelCb,
        };
        $s.m.modalLarge = opts.large;
      });
    },
    confirm: function(opts) {
      $s.m.alert(opts); // alias
    },
    prompt: function(opts) {
      if (opts.bodyHTML) opts.bodyHTML = $sce.trustAsHtml(opts.bodyHTML);

      $timeout(function() {
        $s.m.modal = "dynamic";
        $s.m.dynamic = angular.extend({
          // defaults:
          ok: true,
          cancel: true,
        }, opts);
        $s.m.modalLarge = opts.large;

        // now focus on the input. for some reason won't work in the same tick, do it in a sec instead
        setTimeout(function() {
          var selector = '.modal .dynamic input[type='+ (opts.passwordInput ? 'password' : 'text') +']';
          angular.element(selector).focus(); // horribly un Angular-ish...
        }, 50);
      });
    },
    progTagEditor: function(tag, funcString, opts) {
      $timeout(function() {
        $s.m.modal = "dynamic";
        $s.m.dynamic = {
          title: 'algorithmic tag: "' + tag.name + '"',
          progTag: tag,
          ok: true,
          okText: 'save and run',
          cancel: true,
          okCb: opts.cb,
          thirdButton: opts.thirdButton,
          thirdButtonCb: opts.thirdButtonCb,
        };
        $s.m.modalLarge = true;


        $s.m.dynamic.editor = ace.edit('prog-tag-editor-field');
        $s.m.dynamic.editor.setTheme('ace/theme/dawn');
        var sesh = $s.m.dynamic.editor.getSession()
        sesh.setMode('ace/mode/javascript');
        sesh.setUseWrapMode(true);
        sesh.setTabSize(2);
        sesh.setUseSoftTabs(true);
        sesh.setUseWorker(false);

        $s.m.dynamic.editor.setValue(funcString);
        $s.m.dynamic.editor.gotoLine(0, 0); // deselect and go to beginning (setValue sometimes selects all and/or puts cursor at end)
        setTimeout(function () {
          $s.m.dynamic.editor.resize();
        }, 550); // modal opening animation takes 500ms

      });
    },
  };

  $s.$watch('m.modal', function(newVal) {
    if (['dynamic', 'shortcuts', 'settings', 'account'].indexOf(newVal) !== -1) {
      // vertically align:
      $interval(function() {
        var el = angular.element(".circle > div:visible")[0];
        if (el) {
          el.style.setProperty('margin-top', (el.offsetHeight/(-2)) + 'px');
        }
      }, 10, 50, false); // check every 10ms for 500ms, don't invoke $apply
    }
  });

  // keeps track of changes. nuts and tags will map from id to reference to actual object nut/tag object in $s
  $s.digest = {
    reset: function() {
      this.config = {};
      this.nuts = {};
      this.tags = {};
      this.status = 'synced'; // options: synced, syncing, unsynced, disconnected
    },
    // properties that should not be uploaded to firebase - map of field -> array of props
    excludeProps: {
      "nuts": ["sortVal"]
    },
    push: function() {
      if ($s.digest.pushHackCounter > 0) return;

      // note: this is called from various places - we can't rely on 'this' so use $s.digest
      // console.log("digest: checking for changes to push");
      var updated = false;
      ['config', 'nuts', 'tags'].forEach(function(field) {
        if (Object.keys($s.digest[field]).length != 0) {
          $s.digest.pushHackCounter++;
          var dupe = angular.copy($s.digest[field]);

          // now we have to go through every prop of every obj and strip out anything from excludeProps
          if ($s.digest.excludeProps[field]) {
            angular.forEach(dupe, function(obj){ // for every object...
              if (!obj) return; // could be null: deleting the value from Firebase
              $s.digest.excludeProps[field].forEach(function(prop) { // for every excludeProp...
                if (obj[prop] !== undefined) delete obj[prop];
              });
            });
          }

          $s.digest.status = 'syncing';
          $s.ref.child(field).update(dupe, $s.digest.pushCB);
          updated = true;
        }
      });

      if (updated) {
        console.log("digest: changes found, pushing");
      }
      else if (this.status != 'synced') {
        this.status = 'synced';
        $timeout(function(){$s.$apply();}); // HACK: otherwise cloud icon doesn't seem to change after status gets set to synced
      }
    },
    pushHackCounter: 0, // HACK instead of figuring out how to get Firebase update() to return promises for $q.all(), or instead of using jQuery deferreds. this counter is incremented when we invoke update on Firebase ref, decremented when callback happens - if we reach 0, we're done. i think the worst-case scenario is that cb is called really quickly, so we go from 0-1-0-1-0 instead of 0-1-2-1-0, but that's kind of okay
    pushCB: function(err) {
      $s.digest.pushHackCounter--;
      if (err) {
        alert("Error syncing your notes to the cloud! Some stuff may not have been saved. We'll keep trying though. You can email me at toby@nutmeg.io if this keeps happening. Tell me what this error says: " + JSON.stringify(err));
        this.status = 'disconnected';
        $timeout(function(){$s.$apply();});
        return;
      }
      if ($s.digest.pushHackCounter == 0) {
        console.log("digest: changes pushed successfully");
        $s.digest.reset();
        $timeout(function(){$s.$apply();}); // HACK: otherwise cloud icon doesn't seem to change after status gets set to synced
      }
    }
  }
  $s.digest.reset(); // also initializes

  // user authentication
  $s.u = {
    // when loading and !loggedIn, "go" button for login and createaccount is replaced with loading spinner
    // when loading and loggedIn, notes of already-logged-in user are loading, and full-page loader is shown
    loggedIn: false,
    loggingIn: false, // different loading animation while logging in
    loading: false,

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
          switch (error.code) {
            case "INVALID_EMAIL":
              alert("The specified user account email is invalid.");
              break;
            case "EMAIL_TAKEN":
              alert("TODO");
              break;
            case "INVALID_USER":
              alert("The specified user account does not exist.");
              break;
            case "NETWORK_ERROR":
              alert("TODO");
              break;
            default:
              alert("Error logging in: " + JSON.stringify(error));
          }
          alert("Error creating account: " + JSON.stringify(error));
          $s.u.loading = false;
        }
      });
    },

    forgotPassword: function() {
      var email = prompt('Please enter your email:', $s.u.email);
      if (!email) return false;

      $s.m.working = true;

      $s.u.auth.sendPasswordResetEmail(email, function(err) {
        $s.m.working = false;

        if (err) {
          alert('Sorry, something went wrong, please try again later'); // TODO
          console.log(err);
          return;
        }
        alert('Password reset email successfully sent to ' + email + '! Please check your email.');
        $s.u.password = '';

        $s.$apply();

        // TODO: firebase lets you detect if user logged in with temporary token. should do so, and alert user to change password
      });

      return false;
    },

    changePassword: function() {
      if (!$s.u.password) {
        alert("You didn't enter your current password!");
        return;
      }
      else if ($s.u.newPass1 !== $s.u.newPass2) {
        alert("New passwords don't match!");
        return;
      }
      else if (!$s.u.newPass1) {
        alert("You didn't enter a new password!");
        return;
      }
      else if ($s.u.newPass1 === $s.u.password) {
        alert("New password is the same as your current password!");
        return;
      }

      $s.m.working = true;

      $s.u.auth.changePassword($s.u.user.email, $s.u.password, $s.u.newPass1, function(err) {
        if (err) {
          if (err.code == 'INVALID_PASSWORD') {
            alert('Incorrect current password');
            $s.u.password = '';
          }
          else {
            alert('Failed to change password: ' + err.code);
          }
        }
        else {
          alert ('Password changed successfully!');
          $s.u.password = $s.u.newPass1 = $s.u.newPass2 = '';
        }

        $s.m.working = false;
        $s.$apply();
      });

      return false;
    },

    /** UI function to change display name */
    changeDisplayName: function(newName) {
      if (!newName) return;

      $s.m.working = true;
      $s.u._changeDisplayName(newName, function(err) {
        alert('Display name successfully set to "' + newName + '"'); // TODO inline checkmark will do
        $s.m.working = false;
        $s.$apply();
      });
    },
    /** actually save changed display name on server and in local user object */
    _changeDisplayName: function(newName, cb) {
      console.log('changing display name from', $s.u.user.displayName, 'to', newName);

      $s.ref.child('user/displayName').set(newName, function(err) {
        if (cb) cb(err);

        if (err) {
          console.error('problem setting display name...');
          return;
        }

        $s.u.user.displayName = newName;
        $s.u.displayNameSet = true;
        $s.$apply();
      });
    },
    displayNameSet: false, // silly tidbit for changing account dialog text

    login: function(email, password, calledFromCreateAccount) {
      console.log("login() called")
      if (!calledFromCreateAccount && $s.u.loading) return;

      $s.u.loading = true;
      $s.u.loggingIn = true;
      $s.u.auth.login('password', {
        'email': email,
        'password': password,
        'rememberMe': true
      });
    },

    auth: new FirebaseSimpleLogin(new Firebase('https://nutmeg.firebaseio.com/'), function(error, user) {
      if (error) {
        // an error occurred while attempting login
        switch (error.code) {
          case "INVALID_EMAIL":
          case "INVALID_PASSWORD":
          case "INVALID_USER":
            alert("Incorrect account credentials."); // TODO friendlier message
            $s.u.password = '';
            break;
          case "NETWORK_ERROR":
            alert("TODO");
            break;
          default:
            alert("Error logging in: " + JSON.stringify(error));
        }
        $s.u.loading = false; // so that they get the button back and can try again
        $s.$apply();
      }
      else if (user) {
        // user authenticated with Firebase
        console.log('Logged in, user id: ' + user.id + ', provider: ' + user.provider);
        $timeout(function() {
          $s.u.loading = true; // while notes are loading
          $s.u.loggedIn = true;
        });
        $s.u.user = user;
        init(user.uid, function(featuresSeen) {
          console.log("init callback")
          $s.$apply(function() {
            $s.n.assignSortVals($s.n.sortBy);
            $s.m.closeModal();
            $s.u.loading = false; // used for login/createaccount loading spinner
            $s.u.loggingIn = false;
            $s.u.email = $s.u.password = $s.u.pass1 = $s.u.pass2 = ""; // clear input fields so they're not still shown there when they log out: otherwise, anyone can just hit log in again
          });

          var featuresSeenRef = new Firebase('https://nutmeg.firebaseio.com/users/' + $s.u.user.uid + '/featuresSeen');

          new Firebase('https://nutmeg.firebaseio.com/newFeatureCount').once('value', function(data) {
            var newFeatureCount = data.val();
            if (featuresSeen !== undefined) {
              if (featuresSeen < newFeatureCount) {
                console.log("latestFeatures: there are some new features user hasn't seen");
                new Firebase('https://nutmeg.firebaseio.com/newFeatures').once('value', function(data) {
                  var feats = data.val();
                  feats.splice(0, featuresSeen); // cuts off the ones they've already seen;
                  var list = feats.map(function(val) { return "<li>"+val+"</li>"; }).join("");

                  $s.m.alert({
                    title: "Since you've been gone...",
                    bodyHTML: "<p>In addition to tweaks and fixes, here's what's new:</p><ul>" + list + "</ul><p>As always, you can send along feedback and bug reports from the menu, which is at the bottom right of the page.</p>",
                    okText: 'Cool',
                    large: true
                  });

                  featuresSeenRef.set(newFeatureCount);
                });
              }
              else {
                console.log("latestFeatures: already seen em");
              }
            }
            else {
              // new user
              console.log("latestFeatures: new user");
              featuresSeenRef.set(newFeatureCount)
            }
          });
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
  }; // end $s.u - user account stuff

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
      // NOTE: changes to the fields might require changes to the nutSort filter
    ],

    /* go through all $s.n.nuts and assign property sortVal 
     * 
     * basically we don't want sort order updating *while* you're editing some
     * property that we're sorting on. e.g. you're sorting on recently modified
     * and as you start typing, that note shoots to the top.
     *
     * procedure:
     *
     * 1. make a copy of nuts
     * 2. sort it
     * 3. iterate through and assign $s.n.nuts[id].sortVal = index in sorted copy
     */
    assignSortVals: function(sortOpt) {
      if (!$s.n.nuts) return; // sometimes we get called before anything has been set up
      console.log("sorting...");

      // STEP 1
      var dupe = angular.copy($s.n.nuts);

      // STEP 2
      if (sortOpt.field.indexOf(".") !== -1 ) { // e.g. field might be "tags.length"
        var fields = sortOpt.field.split(".");
        dupe.sort(function(a, b) {
          var aVal = a[fields[0]] ? a[fields[0]][fields[1]] : 0;
          var bVal = b[fields[0]] ? b[fields[0]][fields[1]] : 0;
          return aVal - bVal;
        })
      }
      else { // e.g. "created"
        dupe.sort(function(a, b) {
          return a[sortOpt.field] - b[sortOpt.field];
        })
      }
      // NOTE: this is a more generic way to deal with this indexing of sub-objects by dot-notation string: http://stackoverflow.com/a/6394168

      if (sortOpt.rev) dupe.reverse();

      // STEP 3
      dupe.forEach(function(sortedNut, sortedIndex) {
        if (sortedNut) { // some will be undefiend
          $s.n.nuts[sortedNut.id].sortVal = sortedIndex;
        }
      })

      setTimeout(angular.element("body").scope().n.autosizeAllNuts, 5);
    },

    /* 
     * merge passed nut with defaults and store it
     * NOTE: this is allowing totally empty nuts... that's how we make blank new nuts. also would be a minor pain to disallow (what if you create non-empty and then update to empty?) and i can't see it causing problems so it's okay. we can do a "this nut is empty would you like to delete?" message maybe
     */
    createNut: function(nut) {
      var newId = this.nuts.length; // will be index of new nut

      // if we've specifically passed in tags on this nut, use those. otherwise, maybe use query-filtering tags
      if (!nut.tags && $s.c.config.addQueryTagsToNewNuts && $s.q.tags && $s.q.tags.length > 0) {
        nut.tags = $s.q.tags.slice(); // slice to duplicate
      }

      this.nuts.push($.extend({
        // default nut:
        body: '',
        tags: [], // array of tag ids
        created: (new Date).getTime(),
        modified: (new Date).getTime(),
        history: [], // an array of nuts, last is the latest
        id: newId,
        sortVal: -1 * newId // ensures that this new nut is always sorted first until stuff is re-sorted
      }, nut));

      if (nut.tags && nut.tags.length > 0) {
        // add this doc id to each of the tags
        nut.tags.forEach(function(tagId){
          $s.n.addTagIdToNut(tagId, newId);
        });
      }

      this.nutUpdated(newId); // saves state in history, updates index, etc.
      console.log("new nut "+newId+" has been created");

      if ($s.q.showNuts) {
        $s.q.showNuts.push(newId); // ensures that the new nut is visible even if we have a search query open
      }

      $timeout(function() {
        $s.n.focusOnNutId(newId);
        $s.n.autosizeAllNuts();
      }, 0);

      return newId;
    },
    createNuts: function(nuts){
      nuts.forEach(function(nut) {
        $s.n.createNut(nut);
      });
    },

    // accepts nut or nut ID
    deleteNut: function(nut, noconfirm) {
      if (typeof nut == "number") {
        nut = $s.n.nuts[nut];
        if (!nut) return;
      }

      if (!noconfirm && !confirm("Are you sure you want to delete this note? This can't be undone.\n\nIt's the note that goes like this: \"" + (nut.body ? nut.body.substr(0, 100) : "") + "...\"")) {
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

    // creates new nut with same tags as tags of given nut
    // accepts nut or nut ID
    duplicateNoteTags: function(nut) {
      if (typeof nut == "number") {
        nut = $s.n.nuts[nut];
        if (!nut) return;
      }
      $s.n.createNut({
        tags: nut.tags.slice() // slice to duplicate array
      });
    },

    /* call whenever a nut is updated
     * can accept nut id OR nut
     * is called, for instance, via nutBlur when textarea blurs or when tags added/removed
     * 1: updates history. NOTE: we store entire state of nut in each history entry. could instead store just changes if this gets to big. NOTE 2: by the time this is called, the view and model have already changed. we are actually storing the CHANGED version in history.
     * 2: updates `modified` (default - pass false in as second param to disable)
     * 3: updates lunr index (default - pass false in as third param to disable). note, this can be slow: 0.5s for 40k char text on one machine)
     * 4: runs through all programmatic tags (default - pass false in as third param to disable). might be slow depending on user functions
     * 5: adds to digest to be saved to firebase
     */
    nutUpdated: function(nut, updateModified, fullUpdate) {
      updateModified = defaultFor(updateModified, true);
      fullUpdate = defaultFor(fullUpdate, true);

      $s.digest.status = 'unsynced';

      if (typeof nut == "number") {
        nut = $s.n.nuts[nut];
        if (!nut) return;
      }

      if (false && $s.c.config.maxHistory > 0) { // disabled for now
        // TODO history is a bit overzealous. this function can get called every second. at the very least, history should only be separated when the note blurs. or it could even be by session. and should maybe me stored separately from the note so that not EVERY SINGLE push sends whole history
        var oldState = $.extend(true, {}, nut); // deep clone ourself
        delete oldState.history; // no need for the history to have history
        nut.history.push(oldState); // append ourselves into history
        if (nut.history.length > $s.c.config.maxHistory) {
          nut.history.shift(); // chuck the oldest one
        }
      }
      else if (nut.history) {
        // TEMPORARY: while feature is disabled, delete any pre-existing history
        delete nut.history;
      }

      if (updateModified) {
        nut.modified = (new Date).getTime()
      }

      if (fullUpdate) {
        $s.n.nutDoFullUpdate(nut);
      }

      $s.digest.nuts[nut.id] = nut;

      console.log("nut "+nut.id+" has been updated");
    },

    nutDoFullUpdate: function(nut) {
      console.log('doing full update of nut ' + nut.id);
      $s.n.updateNutInIndex(nut);
      $s.n.runProgTags(nut);
      delete nut.fullUpdateRequired;
      $s.n.nutUpdated(nut, false, false);
    },

    nutSaver: null, // to hold what setInterval() returns
    nutWas: "", // this will store what the currently-focused nut body was before focusing, in order to determine, upon blurring, whether anything has changed
    maybeUpdateNut: function(nut, blurred) {
      blurred = defaultFor(blurred, false); // have to set explicitly to false, cause undefined produces unexpected behavior in nutUpdated()

      if ($s.n.nutWas == nut.body) {
        console.log("nut unchanged");

        if (blurred) {
          // so this nut hasn't changed, only problem is that, due to action on textarea keypress, digest.status == "unsynced" even if they just used arrow keys or typed then undid. however, we can't just set digest.status to "synced", because maybe there are pending changes so that would be a lie
          $s.digest.push(); // if there are no changes in the digest, this won't do anything except set digest.status to "synced". if there ARE changes in the digest, it'll push them a second or two earlier than we otherwise would have
        }
      }
      else {
        console.log("nut changed!");
        $s.n.nutUpdated(nut, true, blurred); // true for updateModified (default), full update (update index, prog tags) only when blurring
        if (!blurred) {
          nut.fullUpdateRequired = true; // we haven't blurred now, so we're not doing full update. need to make sure we full update (update lunr index and prog tags) later even if nut is unchanged by the time we blur
        }
        $s.n.nutWas = nut.body;
      }
    },
    nutFocus: function(nut) {
      console.log("focus on nut "+nut.id);
      this.nutWas = nut.body;
      clearInterval(this.nutSaver); // in case there was anything there before

      this.nutSaver = setInterval(function() {
        $s.n.maybeUpdateNut(nut);
      }, ((nut.body && nut.body.length < 5000) ? 1000 : 5000) ); // every 1s if <5000 chars long, every 5s if over. crudely saves bandwidth. digest pushes every 4s so this will halve # of pushes
    },
    nutBlur: function(nut) {
      console.log("blur on nut "+nut.id);
      this.maybeUpdateNut(nut, true);
      clearInterval(this.nutSaver);

      // because we don't update index/prog tags while typing/focused because it can be slow
      if (nut.fullUpdateRequired) {
        $s.n.nutDoFullUpdate(nut);
      }
    },

    runProgTags: function(nut) {
      console.log('running prog tags for nut ' + nut.id + ':');
      console.groupCollapsed();
      $s.t.tags.forEach(function(tag) {
        if (tag.prog) {
          $s.t.runProgTagOnNut(tag, nut);
        }
      });
      console.groupEnd();
    },

    updateNutInIndex: function(nut) {
      // update just does `remove` then `add` - seems to be fine that this gets called even when it's a totally new nut
      $s.lunr.update({
        id: nut.id,
        body: nut.body,
        tags: nut.tags ? nut.tags.map(function(i){
          if ($s.t.tags[i]) { // if this tag id actually exists in $s.t.tags
            return $s.t.tags[i].name;
          }
          else {
            // dunno how a tag id pointing to an undefined (most likely deleted) tag got in here but let's do some clean-up
            $s.n.removeTagIdFromNut(i, nut.id);
            return "";
          }
        }).join(" ") : ""
      });
    },

    removeNutFromIndex: function(nut) {
      $s.lunr.remove({
        id: nut.id
      });
    },

    // each nut has an array of tags and each tag has an array of nuts it belongs to. this function ensures this remains consistent when adding tags to nuts
    addTagIdToNut: function(tagId, nutId, viaProg) {
      if ($s.t.tags[tagId].prog && ! viaProg) {
        $s.t.progTagCantChangeAlert(tagId);
        return;
      }

      var updated = false;

      // add tag id to nut if it's not already there
      if ($s.n.nuts[nutId].tags.indexOf(tagId) === -1 ) {
        $s.n.nuts[nutId].tags.push(tagId);
        updated = true;
      }
      // add nut id to tag if it's not already there
      if ($s.t.tags[tagId].docs.indexOf(nutId) === -1 ) {
        $s.t.tags[tagId].docs.push(nutId);
        updated = true;
      }

      if (updated) {
        $s.n.rebuildNoteSharing($s.n.nuts[nutId]);
        console.log("added tag "+tagId+" to nut "+nutId);
        this.nutUpdated(nutId, $s.c.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
        $s.t.tagUpdated(tagId);
      }
    },
    removeTagIdFromNut: function(tagId, nutId) {
      var updated = false;

      // remove tag id from nut (check it's there first so we don't splice out -1)
      if ($s.n.nuts[nutId] && $s.n.nuts[nutId].tags && $s.n.nuts[nutId].tags.indexOf(tagId) !== -1 ) {
        $s.n.nuts[nutId].tags.splice($s.n.nuts[nutId].tags.indexOf(tagId), 1);
        updated = true;
      }
      // you get it
      if ($s.t.tags[tagId] && $s.t.tags[tagId].docs && $s.t.tags[tagId].docs.indexOf(nutId) !== -1 ) {
        $s.t.tags[tagId].docs.splice($s.t.tags[tagId].docs.indexOf(nutId), 1);
        updated = true;
      }

      if (updated) {
        $s.n.rebuildNoteSharing($s.n.nuts[nutId]);
        console.log("removed tag "+tagId+" from nut "+nutId);
        this.nutUpdated(nutId, $s.c.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
        $s.t.tagUpdated(tagId);
      }
    },

    /**
     * takes one note loops through all its tags and updates sharing info here accordingly (for firebase security rules convenience). 
     * TODO: right now this doesn't run nutUpdated, because it gets called from stuff (like removeTagIdFromNut) that also alls nutUpdated, so it can get ridiculous... need to build a debounce function that understands arguments so that we can safely call it from here
     */
    rebuildNoteSharing: function(nut) {
      var newShare = {};

      _.each(nut.tags, function(tagId) {
        // TODO: if one tag is sharing with one person as 'r' and another tag is also on this note sharing with the same person as 'w', the 'w' should take precedence. right now precedence is essentially random, so fix it
        _.extend(newShare, $s.t.tags[tagId].share);
      });

      nut.share = newShare;
    },

    autosizeAllNuts: function() {
      angular.element(".nut textarea").each(function(i, ta){
        $s.n.autosizeNutByEl(ta);
      });
    },

    // hack, needed because ngChange doesn't pass element
    autosizeNutById: function(id) {
      this.autosizeNutByEl(angular.element("#nut-"+id+"-ta")[0]);
    },

    autosizeNutByEl: function(el) {
      if (!el) return;

      var oldDocScroll = $(document).scrollTop();
      var oldScroll = el.scrollTop;

      el.style.height = "auto";
      el.style.height = el.scrollHeight + 'px';

      $(document).scrollTop(oldDocScroll);
      el.scrollTop = oldScroll;
    },

    focusOnNutId: function(id) {
      $timeout(function() {
        angular.element("#nut-"+id+"-ta")[0].focus();
      });
    },
    // currently unused:
    focusOnFirstResult: function() {
      var el = angular.element("#nuts .nut textarea")[0];
      if (el) { $timeout(function() { el.focus(); }); }
    },

    getFocusedNut: function() {
      var match = document.activeElement.id.match(/^nut-(\d*)-ta$/); // ids are all e.g. nut-11-ta
      return match ? $s.n.nuts[match[1]] : null;
    },
    getFocusedNutID: function() {
      var match = document.activeElement.id.match(/^nut-(\d*)-ta$/); // ids are all e.g. nut-11-ta
      return match ? parseInt(match[1]) : null;
    },
    // get scope of the controller of the currently focused nmNut directive. from here we can do things like openAddTagField()
    getFocusedNutScope: function() {
      // check if we are focused on a <nm-nut> element or a child of one
      if ($(document.activeElement).parents("nm-nut").length > 0 || document.activeElement.tagName.toLowerCase() == "nm-nut") {
        return $(document.activeElement).scope();
      }
    },

    countShownNuts: function() {
      var count;
      if (!$s.n.nuts) {
        count = 0;
      }
      else if ($s.q.showAll) {
        // need to do reduce cause this is a sparse array
        count = $s.n.nuts.reduce(function(prev, current) { return current ? prev+1 : prev; }, 0);
      }
      else {
        count = $s.q.showNuts.length;
      }
      return count + (count == 1 ? " note" : " notes");
    }

  };

  $s.n.sortBy = $s.n.sortOpts[0]; // set initial value for nut sort select dropdown TODO: this should be remembered and drawn from config

  // ==== PRIVACY STUFF ==== //

  $s.p = {
    privateMode: false,

    togglePrivateMode: function() {
      if (! $s.p.privateMode) {
        // it's off: we're turning it on. ask for password
        $s.m.prompt({
          message: 'Please enter your login password to view private notes:',
          passwordInput: true,
          dontCloseOnOk: true,
          okCb: function(password) {
            if (! password) return;

            $s.m.working = true;

            checkPassword(password, function(passwordCorrect) {
              if (! passwordCorrect) {
                alert('Incorrect password!');
              }              
              else {
                $s.m.closeModal();
                $s.p.privateMode = true;
                $s.q.doQuery(); // re-filter which notes to show
              }
              $s.m.working = false;
              $s.$apply();
            });
          }
        });
      }
      else {
        // private mode was on: we're turning it off.
        $s.p.privateMode = false;
        $s.q.doQuery(); // re-filter which notes to show
      }
    }
  };

  /** calls cb with true/false if password is correct/incorrect */
  function checkPassword(password, cb) {
    if (! password) return cb(false);

    if (! $s.u.user && ! $s.u.user.email) {
      console.error('user not logged in or there was a problem initializing user info');
      return cb(false);
    }

    // HACK: we try to change their firebase password using supplied password. but the password we change it *to* is the same password, so if it's correct, result is nothing happens. if password is incorrect, however, we get an error
    $s.u.auth.changePassword($s.u.user.email, password, password, function(err) {
      if (err) return cb(false);
      else return cb(true);
    });
  }

  // ==== QUERY STUFF ==== //

  $s.q = {
    showAll: true,
    query: "", // modeled in query bar and watched for changes by nmQuery directive, which calls doQuery()
    tags: [], // list of tag ids we are filtering by - will be intersected with results of lunr search. also, if $s.c.config.addQueryTagsToNewNuts, then... you guessed it

    toggleTag: function(tagId, e) {
      var i = this.tags.indexOf(tagId);
      if (i == -1) {
        if (e && e.shiftKey) { // being toggled from a mouse shift+click
          this.addTag(tagId);
        }
        else {
          this.tags = [tagId];
          $s.q.doQuery();
        }
      }
      else {
        this.removeTag(tagId);
      }
    },
    addTag: function(tagId) {
      if (this.tags.indexOf(tagId) == -1) {
        this.tags.push(tagId);
        $s.q.doQuery();
      }
    },
    removeTag: function(tagId) {
      var i = this.tags.indexOf(tagId);
      if (i != -1) {
        this.tags.splice(i, 1);
        $s.q.doQuery();
      }
    },

    // query is string, tags is array of tag IDs
    doQuery: function(query, tags) {
      query = defaultFor(query, this.query);
      tags = defaultFor(tags, this.tags);

      console.log("queried \""+query+"\" with tags "+JSON.stringify(tags));

      var filteredByTags, filteredByString, filteredByPrivate;

      // FIRST get the docs filtered by tags
      if (tags && tags.length > 0) {
        var arrays = [];
        tags.forEach(function(tagId) {
          arrays.push($s.t.tags[tagId].docs);
        });
        filteredByTags = multiArrayIntersect(arrays);
      }

      // NEXT get the docs filtered by any string
      if (query.length > 2) { // only start live searching once 3 chars have been entered
        var results = $s.lunr.search(query); // by default ANDs spaces: "foo bar" will search foo AND bar
        // results is array of objects each containing `ref` and `score`
        // ignoring score for now
        filteredByString = results.map(function(doc){ return parseInt(doc.ref); }); // gives us an array
      }

      // ALSO check private notes
      if (! $s.p.privateMode && $s.n.nuts && $s.n.nuts.length) {
        // private mode off, so hide private notes. get array of note IDs that aren't private:
        filteredByPrivate = ($s.n.nuts
                             .filter(function(nut) { return !nut.private; })
                             .map(function(nut) { return nut.id; }) );

        if (filteredByPrivate.length === 0) {
          // *every* note is private (and private mode is off) so we're done:
          this.showAll = false;
          this.showNuts = [];
          return;
        }
      }

      var filterArrays = [];
      if (filteredByTags && filteredByTags.length) filterArrays.push(filteredByTags);
      if (filteredByString && filteredByString.length) filterArrays.push(filteredByString);
      if (filteredByPrivate && filteredByPrivate.length) filterArrays.push(filteredByPrivate);

      if (filterArrays.length) {
        this.showAll = false;
        this.showNuts = multiArrayIntersect(filterArrays);
      }
      else {
        this.showAll = true;
      }

      $timeout($s.n.autosizeAllNuts, 5);
    },

    clear: function() {
      this.query = "";
      this.tags = [];
      this.doQuery();
    },
    focus: function() {
      angular.element('#query .search')[0].focus();
    },

    setupAutocomplete: function() {
      $s.autocomplete(angular.element("#query .search")); // will remove any existing autocomplete
    }
  }; // end of $s.q

  // backspace in first position of searchbar when there are tags should delete last tag
  // TODO: not sure in what browsers selectionStart works, but it's not all. make sure that it doesn't always return 0 in some browsers, cause then we'll be deleting all the time
  $("#query .search").on("keydown", function(e) {
    if (e.keyCode == 8 && $("#query .search")[0].selectionStart == 0 && $s.q.tags.length > 0) {
      $s.q.removeTag($s.q.tags[$s.q.tags.length-1]);
      $s.q.setupAutocomplete(); // reset autocomplete so that newly removed tag is in suggestions again
      $timeout($s.n.autosizeAllNuts, 5); // this should get called anyway but for some reason is not working when backspacing tags
    }
  });


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
      var newId = this.tags.length; // will be index of new nut
      this.tags.push($.extend({
        docs: [], // array of doc ids that have this
        created: (new Date).getTime(),
        modified: (new Date).getTime(),
        id: newId
      }, tag));
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

    getTagNameById: function(id) {
      if ($s.t.tags[id]) return $s.t.tags[id].name;
      else return null;
    },

    deleteTag: function(tag) {
      if (!confirm('Are you sure you want to delete the tag "'+tag.name+'"? This can\'t be undone.')) {
        return;
      }

      // tag.docs.slice() returns a duplicate of the array. necessary, because removeTagIdFromNut() splices actual `tag.docs` - if we splice out stuff while iterating over it with forEach, we won't iterate over them all
      if (tag.docs) {
        tag.docs.slice().forEach(function(docId) {
          $s.n.removeTagIdFromNut(tag.id, docId);
        });
      }

      if (tag.share) {
        $s.t.unshareTagWithAll(tag);
      }

      delete this.tags[tag.id];

      $s.digest.tags[tag.id] = null;
      $s.digest.push(); // update right away

      console.log("tag "+tag.id+" ("+tag.name+") has been deleted");
    },

    editTag: function(tag) {
      var newName = prompt("Enter a new name for this tag", tag.name);
      if (newName) {
        tag.name = newName;
        console.log("tag "+tag.id+"'s name updated to "+tag.name);
        this.tagUpdated(tag.id, true);
      }
    },

    /** make or unmake tag programmatic */
    tagProgSettings: function(tag) {
      // modal with code editor for user to enter function:
      $s.m.progTagEditor(tag, $s.t.getTagProgFuncString(tag), {
        cb: function(funcString) {
          if (!funcString) return;

          funcString = funcString.replace(PROG_TAG_INFO, '').trim(); // no need to store PROG_TAG_INFO, and we add it back on when we display it anyway

          tag.progFuncString = funcString;

          var cancel;

          if (!tag.prog && tag.docs.length) {
            // if tag was not programmatic and already had some documents
            var singular = tag.docs.length === 1;
            cancel = ! confirm('Warning: you currently have ' + tag.docs.length + ' note' + (singular ? '' : 's') + ' tagged with "' + tag.name + '". ' + (singular ? 'It' : 'They') + ' will be untagged if ' + (singular ? 'it doesn\'t' : 'they don\'t') + ' return true for this function.\n\nAre you sure you wish to continue?');
          }

          if (cancel) {
            // modal has just been closed, so reopen it in another tick
            $timeout(function() {
              $s.t.tagProgSettings(tag);
            }, 50);
            
            return;
          }

          tag.prog = true;
          $s.t.tagUpdated(tag);
          $s.t.runProgTagOnAllNuts(tag);
        },

        // if tag is already programmatic, menu lets them undo that:
        thirdButton: tag.prog ? 'revert to normal tag' : null,
        thirdButtonCb: tag.prog ? function() {
          tag.prog = false;
          $s.t.tagUpdated(tag);
          $s.m.closeModal();
        } : null,
      });
    },

    getTagProgFuncString: function(tag) {
      var funcString;
      if (tag.progFuncString) {
        funcString = tag.progFuncString;
      }
      else {
        var tagNameString = JSON.stringify(tag.name); // handles quotes and other special chars
        funcString = _.sample(PROG_TAG_EXAMPLES).replace(new RegExp('"TAGNAME"', 'g'), tagNameString);
      }

      if (funcString.indexOf(PROG_TAG_INFO) === -1) {
        funcString += '\n' + PROG_TAG_INFO;
      }

      return funcString;
    },

    /** for programmatic tag, go through all notes and tag according to function */
    runProgTagOnAllNuts: function(tag) {
      if (!tag.prog) return;

      var classifier = $s.t.progTagGetClassifier(tag);

      console.log('running prog tag ' + tag.id + ' on all notes:');
      console.groupCollapsed();
      $s.n.nuts.forEach(function(nut) {
        $s.t.runProgTagOnNut(tag, nut, classifier);
      });
      console.groupEnd();
    },

    /** for given programmatic tag and nut, see if nut should have that tag */
    runProgTagOnNut: function(tag, nut, classifier) {
      if (! classifier) {
        // when processing all, only need to create classifier once and pass it in, otherwise we make it here
        classifier = $s.t.progTagGetClassifier(tag);
      }

      if (classifier(nut) === true) {
        console.log('user classifier for tag ' + tag.id + ' returned true for nut ' + nut.id);
        $s.n.addTagIdToNut(tag.id, nut.id, true);
      }
      else {
        console.log('user classifier for tag ' + tag.id + ' returned false for nut ' + nut.id);
        $s.n.removeTagIdFromNut(tag.id, nut.id);
      }
    },

    /** return a function that takes a note and runs it through user's function, handling errors and in-scope variables accessible to user */
    progTagGetClassifier: function(tag) {
      var classifier = new Function('note', 'getTagNameById', tag.progFuncString); // this line excites me

      // the function we'll actually call:
      return function(nut) {
        try {
          return classifier.apply(tag, [nut, $s.t.getTagNameById]);
        }
        catch (err) {
          $s.t.progTagError(tag, err);
        }
      };
    },

    progTagError: function(tag, err) {
      // closeModal may have been just called, so open up new modal in a different tick:
      $timeout(function() {
        $s.m.confirm({
          bodyHTML: '<p>There was an error when running your function for tag "' + tag.name  + '":</p><pre>  ' + err + '</pre><p>Would you like to change this tag\'s function or revert to normal tag?</p>',
          okText: 'change function',
          okCb: function() {
            // closeModal may have been just called, so...
            $timeout(function() {
              $s.t.tagProgSettings(tag);
            }, 50);
          },
          cancelText: 'revert tag',
          cancelCb: function() {
            tag.prog = false;
            $s.t.tagUpdated(tag);
          },
          large: true,
        });
      }, 50);
    },

    /** alert user that they can't add/remove this tag, let them change it if they need */
    progTagCantChangeAlert: function(tag) {
      if (typeof tag === "number") { // tag id
        tag = $s.t.tags[tag];
      }
      if (!tag) return;

      $s.m.confirm({
        bodyHTML: '<p>"' + tag.name  + '" is an algorithmic tag controlled by the function you entered - it cannot be added or removed manually.</p><p>Would you like to change this tag\'s settings?</p>',
        okText: 'yes',
        okCb: function() {
          // closeModal was just called, so open up new modal in a different tick:
          $timeout(function() {
            $s.t.tagProgSettings(tag);
          }, 50);
        },
        cancelText: 'no'
      });
    },

    /** tag has a `share` object that maps `uid` to permission ('r' for readonly, 'w' for read/write) */
    sharingSettings: function(tag) {
      if (_.isEmpty(tag.share)) {
        // tag not currently shared with anyone, so do simple share prompt:

        // there are several points at which sharing can fail, so define what happens here:
        var failed = function(userSearchQuery, err) {
          console.warn('error trying to find user by email "' + userSearchQuery + '":', err);
          alert('No Nutmeg user found with email "'+ userSearchQuery +'"'); // TODO something about inviting them
          $timeout(function() {
            $s.t.sharingSettings(tag);
          }, 50);
        }

        var perms = 'r'; // read only is all we can do for now

        $s.m.prompt({
          title: 'Sharing "' + tag.name + '"',
          message: 'Please enter the email of another Nutmeg user to share with:',
          textInput: true,
          placeholder: 'email', // TODO only email works
          dontCloseOnOk: true,
          okCb: function(userSearchQuery) {
            if (userSearchQuery === $s.u.user.email) {
              alert('That\'s your email address!'); 
            }
            else if (userSearchQuery.match(/.+@.+\...+/)) { // ultra basic email regex
              $s.m.working = true;
              $s.ref.root().child('emailToId/' + btoa(userSearchQuery)).once('value', function(data) {
                $s.m.closeModal(); // clears `working`, and we have to open new modal anyway after this
                if (data.exists()) {
                  var recipientName = userSearchQuery; // TODO actually grab name
                  var recipientUid = data.val();

                  if (! $s.u.user.displayName) {
                    // prompt them for it!

                    var suggestedDisplayName = _.sample(SAMPLE_DISPLAY_NAMES);

                    $s.m.prompt({
                      bodyHTML: '<p>What do you want to go by?</p><p>You haven\'t selected a display name yet. Please enter a name to identify yourself to users you share with.</p>',
                      textInput: true,
                      placeholder: suggestedDisplayName,
                      okCb: function(displayName) {
                        if (!displayName) displayName = suggestedDisplayName;

                        $s.u._changeDisplayName(displayName);

                        $s.t.shareTagWithUser(tag, recipientUid, recipientName, perms);
                      }
                    });
                  }
                  else {
                    $s.t.shareTagWithUser(tag, recipientUid, recipientName, perms);
                  }
                }
                else {
                  failed(userSearchQuery, 'email doesn\'t exist in firebase');
                }
              }, function(err) {
                failed(userSearchQuery, err);
              });
            }
            else {
              failed(userSearchQuery, 'not a valid email address');
            }
          }
        });
      }
      else {
        // tag is currently being shared
        // TODO open sharing settings
        alert('Tag "'+ tag.name +'" is now not shared with anyone');
        $s.t.unshareTagWithAll(tag); // TODO for now just get rid of it
      }
    },

    shareTagWithUser: function(tag, recipientUid, recipientName, perms) {
      // mark in the *recipient*'s data that we've shared this tag with them
      var recipientTagSharePath = 'users/' + recipientUid + '/share/' + $s.u.user.uid + '/' + tag.id;
      $s.ref.root().child(recipientTagSharePath).set(perms);

      // TODO should actually only continue on success callback

      $timeout(function() {
        $s.m.alert({
          message: 'Now sharing tag "'+ tag.name +'" with "'+ recipientName +'"'
          // should be "ok" or "go to sharing settings"
        });
      }, 50);

      if (!tag.share) tag.share = {};
      tag.share[recipientUid] = perms;
      $s.t.tagUpdated(tag);

      $s.t.updateNotesShareInfo(tag);
    },

    unshareTagWithUser: function(tag, recipientUid) {
      // mark in the *recipient*'s data that they should delete this tag
      var recipientTagSharePath = 'users/' + recipientUid + '/share/' + $s.u.user.uid + '/' + tag.id;
      $s.ref.root().child(recipientTagSharePath).set('d');

      delete tag.share[recipientUid];
      $s.t.tagUpdated(tag);

      $s.t.updateNotesShareInfo(tag);
    },
    unshareTagWithAll: function(tag) {
      if (!tag.share) return;

      console.log('unsharing tag', tag, 'with all users it was shared with');

      _.each(tag.share, function(perm, recipientUid) {
        $s.t.unshareTagWithUser(tag, recipientUid);
      });
    },

    /**
     * takes one tag and updates share info of all the notes associated with it.
     * share info (mapping from uid -> sharing permissions) is duplicated in nuts so that firebase security rules can check it to see if other users can read the note
     */
    updateNotesShareInfo: function(tag) {
      if (!tag.share) return;

      tag.docs.forEach(function (docId) {
        var nut = $s.n.nuts[docId];

        $s.n.rebuildNoteSharing(nut);

        $s.n.nutUpdated(nut, false, false); // TODO should we fullupdate in case prog tags want to depend on sharing? they have the right to be able to do so, but... don't care right now
      });
    },

    /* call whenever a tag is updated. accepts tag or tag id
     * 1: updates `modified`
     * 2: updateNutInIndex() too if updateNut == true, e.g. if the name has changed
     * 3: add to digest
     */
    tagUpdated: function(tag, updateNut) {
      if (typeof tag === "number") { // tag id
        tag = $s.t.tags[tag];
      }
      if (!tag) return;

      $s.digest.status = 'unsynced';
      console.log("tag "+tag.id+" has been updated")
      tag.modified = (new Date).getTime();
      $s.digest.tags[tag.id] = tag;

      if (updateNut && tag.docs) {
        tag.docs.forEach(function(docId) {
          $s.n.nutUpdated(docId, $s.c.config.tagChangesChangeNutModifiedTimestamp); // update history, index, maybe modified (depends on config)
        });
      }
    }

  }; // end of tags
  $s.t.sortBy = $s.t.sortOpts[0]; // set initial value for tag sort select dropdown  

  // a nut is passed if this is being called from add tag to note input field
  // if no nut is passed, this is being called on the query bar
  $s.autocomplete = function(el, nut) {

    // lookupArray should end up as an array of strings
    var lookupArray = $s.t.tags.filter(function(tag) {
      if (!tag) return false; // filter out undefineds
      if (nut) { // we're in the add tag field of a nut
        if (nut.tags) {
          return (nut.tags.indexOf(tag.id) === -1) // filter out tags that are already on this nut
        }
      }
      else { // we're in the search query bar
        return ($s.q.tags.indexOf(tag.id) === -1) // filter out tags that are already in the search query
      }
    });
    lookupArray = lookupArray.map(function(tag) {return tag.name; }); // convert from tag objects to strings

    return $(el).autocomplete({
      width: 150,
      autoSelectFirst: true,
      triggerSelectOnValidInput: false,
      allowBubblingOnKeyCodes: [27], // escape key
      customLookup: function(query, suggestions) {
        // `map` because suggestions is array of {value: "string"} objects
        var results = fuzzyMatchSort(query, suggestions.map(function(s) {return s.value; }));

        // on notes, offer option to add new tag with currently-entered query
        if (nut) {
          var newTagOption = {
            value: query,
            highlighted: '<i>new tag "<b>'+query+'</b>"</i>' // what is actually displayed
          };

          for (var i = 0; i < results.length+1; i++) { // length+1 to go past end and see if we haven't hit threshold yet
            if (i === results.length || results[i].score > NEW_TAG_AUTOCOMPLETE_SCORE_THRESHOLD) {
              results.splice(i, 0, newTagOption);
              break;
            }
          }
        }
        
        return results;
      },
      formatResult: function(suggestion) {
        return suggestion.highlighted;
      },
      onSelect: function(suggestion, e) {
        if (nut) { // we're in the add tag field of a nut
          var scope = $s.n.getFocusedNutScope() || $('#nut-' + nut.id).scope();
          if (scope) {
            scope.addTag(true, suggestion.value);
            scope.closeAddTagField();
            if (e.shiftKey) { // hold shift to add another tag
              $timeout(scope.openAddTagField, 10);
            }
          }
        }
        else { // being called on the search query bar
          $s.q.addTag($s.t.getTagIdByName(suggestion.value));
          $s.q.query = "";
          $s.q.setupAutocomplete(); // reset autocomplete so that newly added tag will not be in suggestions
        }
      },
      lookup: lookupArray
    });
  }


  // ==== KEYBOARD SHORTCUTS ==== //

  /* **properties:**
   *
   * name: duh
   * description (optional): duh
   * fn: duh
   * binding: a string, will be combined with global `mod` (unless `nomod`) and passed directly to mousetrap. see mousetrap docs for more info
   * apply (optional): whether this needs to be wrapped in nmScope.$apply()
   * overkill (optional): for power-users - don't display by default
   * nomod (optional): do not add the global `mod` to binding
   * id: used to create a mapping of id->binding to save in Firebase without unnecessarily copying all of this data. must not change, or else it may fuck up people's existing bindings
   * allowOnModal (optional): by default, shortcuts are disabled when a modal is open, unless this is true
   */

  // latest id: 9
  $s.s = {
    "mod": "ctrl+alt",
    "shortcuts": [
      {
        name: "New note",
        binding: "n",
        fn: function() { $s.n.createNut({}); },
        apply: true,
        id: 0
      }
      , {
        name: "New note, add tag",
        description: "Create a new note and immediately open the input field to add a tag to that note.",
        binding: "shift+n",
        fn: function() {
          $s.n.createNut({});
          $timeout(function() {
            var scope = $s.n.getFocusedNutScope();
            if (scope) { scope.openAddTagField(); }
          }, 25);
        },
        apply: true,
        id: 8
      }
      , {
        name: "Duplicate note tags",
        description: "Create a new note with the same tags as the currently focused note",
        binding: "d",
        fn: function() {
          var id = $s.n.getFocusedNutID();
          if (id) { $s.n.duplicateNoteTags(id); }
        },
        apply: true,
        id: 9
      }
      , {
        name: "Delete note",
        description: "Deletes the note that you are currently editing.",
        binding: "backspace",
        fn: function() {
          var id = $s.n.getFocusedNutID();
          if (id) { $s.n.deleteNut(id); }
        },
        apply: true,
        id: 1
      }
      , {
        name: "Delete note (no confirm)",
        description: "Deletes the note that you are currently editing. Does not ask \"Are you sure?\"",
        binding: 'shift+backspace',
        fn: function() {
          var id = $s.n.getFocusedNutID();
          if (id) { $s.n.deleteNut(id, true); }
        },
        overkill: true,
        apply: true,
        id: 2
      }
      , {
        name: "Add tag",
        description: "Adds tag to the note that you are currently editing.",
        binding: "t",
        fn: function() {
          var scope = $s.n.getFocusedNutScope();
          if (scope) { scope.openAddTagField(); }
        },
        apply: true,
        id: 3
      }

      , {
        name: "Go to search bar",
        binding: "l",
        fn: function() {
          $s.q.focus();
        },
        id: 4
      }
      , {
        name: "Clear search bar",
        binding: "0",
        fn: function() {
          $s.q.clear();
        },
        id: 7,
        apply: true
      }

      , {
        name: "Go to first note",
        binding: "1",
        fn: function() {
          var el = angular.element("#nuts .nut textarea")[0];
          if (el) { el.focus(); }
        },
        id: 5
      }

      , {
        name: "Unfocus",
        description: "Unfocuses from any input/textarea, closes any open modal.",
        binding: "esc",
        fn: function() {
          var nutScope = $s.n.getFocusedNutScope();
          if (nutScope) {
            nutScope.closeAddTagField();
            nutScope.focus();
          }

          $timeout(function() {
            $s.m.cancelModal();
          });

          angular.element("#blur-hack")[0].focus();
        },
        overkill: true,
        nomod: true,
        allowOnModal: true,
        id: 6
      }

      // TODO: scroll up/down?
    ],

    initBindings: function(shortcutConfig) {
      if (!shortcutConfig) {
        console.log("no saved bindings, leaving them as default");
      }
      else {
        console.log("setting up fetched bindings")
        if (shortcutConfig.modKey !== null) {
          $s.s.mod = shortcutConfig.modKey;
        }
        if (shortcutConfig.bindings !== null) {
          $s.s.shortcuts.forEach(function(shortcut) {
            if (shortcutConfig.bindings[shortcut.id]) {
              shortcut.binding = shortcutConfig.bindings[shortcut.id];
            }
          });
        }
      }

      $s.s.bind();
      $s.s.shortcutsEditing = angular.copy($s.s.shortcuts); // this is what's actually bound to the view, so that we can easily cancel
      $s.s.modEditing = $s.s.mod;
    },
    // takes values currently in shortcuts and makes a map to push into firebase
    pushBindings: function() {
      var bindings = {};
      $s.s.shortcuts.forEach(function(shortcut) {
        bindings[shortcut.id] = shortcut.binding;
      });
      $s.ref.child("shortcuts").child("bindings").set(bindings);
      $s.ref.child("shortcuts").child("modKey").set($s.s.mod);
    },

    // takes $s.s.shortcuts and actually turns them into shortcuts
    bind: function() {
      Mousetrap.reset();

      $s.s.shortcuts.forEach(function(shortcut) {
        var binding = shortcut.nomod ? shortcut.binding : $s.s.mod + "+" + shortcut.binding;
        Mousetrap.bindGlobal(binding, function(e) {
          if (!$s.u.loggedIn) return;
          if ($s.m.modal && !shortcut.allowOnModal) return;

          if (shortcut.apply) {
            $s.$apply(shortcut.fn);
          }
          else {
            shortcut.fn();
          }

          return false;
        });
      });
    },

    validModKeys: ['ctrl', 'shift', 'alt', 'option', 'meta', 'mod', 'command'],

    save: function() {
      var cancel = null;
      if ($s.s.modEditing) {
        // check it's valid
        $s.s.modEditing.split('+').forEach(function(modKey) {
          if ($s.s.validModKeys.indexOf(modKey) === -1) {
            alert('"' + modKey + '" is not a valid modifier key. Valid modifier keys are: ' + $s.s.validModKeys.join(', '));
            cancel = true;
          }
        });
      }
      else {
        $s.s.shortcutsEditing.forEach(function(shortcut) {
          if (cancel !== null) return; // they've already ok'd or canceled

          if (shortcut.binding.indexOf('+') === -1) {
            // they have no global modifier key and this shortcut has no modifer key
            cancel = ! confirm('Warning: you have entered no global modifier key and your shortcut for "' + shortcut.name + '" is "' + shortcut.binding + '".\n\nThis means that whenever you press "' + shortcut.binding + '", this shortcut will be run.\n\nHit "OK" to keep this setting, or cancel to use default modifier key.');
            if (cancel) $s.s.modEditing = $s.s.modDefault; // reset to default
          }
        })
      }
      if (cancel) return false;

      $s.m.closeModal();
      $s.s.shortcuts = angular.copy($s.s.shortcutsEditing);
      $s.s.mod = $s.s.modEditing;
      $s.s.bind();

      $s.s.pushBindings();
    },
    cancel: function() {
      $s.m.cancelModal();
      $s.s.shortcutsEditing = angular.copy($s.s.shortcuts);
      $s.s.modEditing = $s.s.mod;
    },
    revert: function() {
      $s.s.shortcutsEditing = angular.copy($s.s.shortcutsDefaults);
      $s.s.modEditing = $s.s.modDefault;
    }
  }; // end $s.s - shortcuts
  $s.s.shortcutsDefaults = angular.copy($s.s.shortcuts); // backup a copy of defaults in case user wants to revert to default
  $s.s.modDefault = $s.s.mod;

  // configuration
  $s.c = {
    // these will serve as defaults
    config: {
      maxHistory: 0,
      tagChangesChangeNutModifiedTimestamp: false,
      addQueryTagsToNewNuts: true,
      showNoteIds: false,

      // layout
      showTagBrowser: true,
      twoColumns: false,
    },

    info: {
      addQueryTagsToNewNuts: {
        humanName: "Add filtered tags to new notes",
        description: "If this is checked, new notes created while searching for certain tags will have those tags too.",
        type: "boolean", // only boolean supported for now
        section: "settings"
      },
      tagChangesChangeNutModifiedTimestamp: {
        humanName: "Tagging updates timestamps",
        description: "If this is checked then adding, removing, and renaming tags will change the \"modified\" timestamp of notes they are attached to.",
        type: "boolean",
        section: "settings"
      },
      showNoteIds: {
        humanName: "Show note IDs",
        type: "boolean",
        section: "settings"
      },
      maxHistory: {
        humanName: "Note history length",
        description: "How many revisions of each note to save. 0 disables history. TOTALLY DISABLED FOR NOW.",
        type: "integer", // integer not supported yet
        section: "settings",
        overkill: true
      },

      //layout
      showTagBrowser: {
        humanName: "Show tag browser",
        type: "boolean",
        section: "layout"
      },
      twoColumns: {
        humanName: "Show two columns of notes",
        type: "integer", // integer not supported yet
        section: "layout",
        overkill: true // not implemented yet
      },
      stickyColumn: {
        humanName: "Sticky column",
        description: "Column on the left is normal, but any notes you mark as 'sticky' are removed from the left column and appear in the right column.", // right column filtered by same search AND sticky, or ONLY sticky? maybe search bar oh wait this is just a specific version of twoColumns HAHA
        type: "integer", // integer not supported yet
        section: "layout",
        overkill: true // not implemented yet
      }
    },

    pushSettings: function() {
      $s.ref.child("settings").set($s.c.config);
    },
    loadSettings: function (settings) {
      $.extend($s.c.config, settings);
    },

    save: function() {
      $s.m.closeModal();
      $s.c.pushSettings();
    },
    cancel: function(section) {
      $s.m.cancelModal();
      if (!section) { // all
        $s.c.config = angular.copy($s.c.configBackup);
      }
      else { // just this section
        angular.forEach($s.c.config, function(value, setting) {
          if ($s.c.info[setting].section == section) {
            $s.c.config[setting] = $s.c.configBackup[setting];
          }
        });
      }
    },
    revert: function(section) {
      if (!section) { // revert all
        $s.c.config = angular.copy($s.c.configDefaults);
      }
      else { // just revert this section
        angular.forEach($s.c.config, function(value, setting) {
          if ($s.c.info[setting].section == section) {
            $s.c.config[setting] = $s.c.configDefaults[setting];
          }
        });
      }
    },
    // called when modal is opened, so that we can revert if they cancel
    backup: function(section) {
      if (!section) { // backup all
        $s.c.configBackup = angular.copy($s.c.config);
      }
      else { // just backup this section
        angular.forEach($s.c.config, function(value, setting) {
          if ($s.c.info[setting].section == section) {
            $s.c.configBackup[setting] = $s.c.config[setting];
          }
        });
      }
    }
  };
  $s.c.configDefaults = angular.copy($s.c.config); // backup a copy of defaults in case user wants to revert to default
  $s.c.configBackup = angular.copy($s.c.config); // will store backup of current settings so that users can cancel


  function init(uid, cb) {
    console.log("init: fetching data for user uid "+uid);
    $s.ref = new Firebase('https://nutmeg.firebaseio.com/users/' + uid);

    $s.ref.once('value', function(data) {
      var featuresSeen;

      if (data.val() === null) {
        console.log("init: new user - initializing with dummy data");
        // must be a new user - even if existing user deleted everything there would still be object with config and empty nuts/tags
        firstInit();
        $s.s.initBindings();
        $s.digest.push();
      }
      else {
        console.log("init: fetched user data");
        // under some conditions (no 0th index?) firebase returns objects
        // need arrays in order to do push and length etc. also IIRC arrays made ng-repeat easier?
        // arrayFromObj also ensures that even if the value is undefined, we get back []
        $s.n.nuts = data.val().nuts instanceof Array ? data.val().nuts : arrayFromObj(data.val().nuts);
        $s.t.tags = data.val().tags instanceof Array ? data.val().tags : arrayFromObj(data.val().tags);

        // get their username and any other info
        _.extend($s.u.user, data.val().user);

        if ($s.u.user.displayName) {
          $s.u.displayNameSet = true; // silly tidbit for changing account dialog text
        }
        else {
          $s.u.displayNamePlaceholder = 'e.g. ' + _.sample(SAMPLE_DISPLAY_NAMES);
        }

        // firebase doesn't store empty arrays, so we get undefined for unused tags. which screws up sorting by tag usage
        $s.t.tags.forEach(function(tag) {
          if (!tag.docs) tag.docs = [];
        });

        $s.n.nuts.forEach(function(nut) {
          // ditto firebase not storying empty arrays
          if (!nut.tags) nut.tags = [];

          // if user was disconnected while editing a note, we won't have done a full update (which we only do on blur), so do that now
          if (nut.fullUpdateRequired) {
            console.log('nut ' + nut.id + ' was saved but requires a full update');
            $s.n.nutDoFullUpdate(nut);
          }
        });

        // TODO: temporary for old users who did firstInit before it saved these things
        $s.ref.child('user').update({
          email: $s.u.user.email,
          provider: $s.u.user.provider,
          lastLogin: Date.now()
        }, function(err) {
          if (err) {
            console.error('problem setting user info...');
            return;
          }
          $s.ref.child('user').on('child_changed', newSessionStarted);
        });
        $s.ref.root().child('emailToId/' + formatForFirebase($s.u.user.email)).set($s.u.user.uid);
        // TODO: end temporary thing. when removing this, using the following instead:
        /*
        $s.ref.child('user/lastLogin').set(Date.now(), function(err) {
          if (err) {
            console.error('problem setting lastLogin...');
            return;
          }
          $s.ref.child('user').on('child_changed', newSessionStarted);
        });
        */

        console.time("building lunr index");
        $s.n.nuts.forEach($s.n.updateNutInIndex);
        console.timeEnd("building lunr index");

        $s.s.initBindings(data.val().shortcuts);
        $s.c.loadSettings(data.val().settings);

        featuresSeen = data.val().featuresSeen;

        $s.q.doQuery();
      }

      // sync to server every 4s
      // if there are no changes this does nothing, so that's fine
      $s.u.digestInterval = window.setInterval($s.digest.push, 4000);
      window.beforeunload = $s.digest.push; // TODO since push() isn't synchronous, probably won't work.

      cb(featuresSeen);
    });

  }

  function firstInit() {
    console.log("init: initializing new user info in user ref");
    $s.ref.child('user').update({
      email: $s.u.user.email,
      provider: $s.u.user.provider,
      lastLogin: Date.now()
    }, function(err) {
      if (err) {
        console.error('problem setting user info...');
        return;
      }
      $s.ref.child('user').on('child_changed', newSessionStarted);
    });

    $s.ref.root().child('emailToId/' + formatForFirebase($s.u.user.email)).set($s.u.user.uid);

    $s.n.nuts = [];
    $s.t.tags = [];

    // load dummy data
    $s.t.createTags([{name: "quote"},{name: "sample notes"},{name: "futurism"}]);
    $s.n.createNuts([{
      body: "\"There are six people living in space right now. There are people printing prototypes of human organs, and people printing nanowire tissue that will bond with human flesh and the human electrical system.\n\n\"We’ve photographed the shadow of a single atom. We’ve got robot legs controlled by brainwaves. Explorers have just stood in the deepest unsubmerged place in the world, a cave more than two kilometres under Abkhazia. NASA are getting ready to launch three satellites the size of coffee mugs, that will be controllable by mobile phone apps.\n\n\"Here’s another angle on vintage space: Voyager 1 is more than 11 billion miles away, and it’s run off 64K of computing power and an eight-track tape deck.\n\n\"The most basic mobile phone is in fact a communications device that shames all of science fiction, all the wrist radios and handheld communicators. Captain Kirk had to tune his fucking communicator and it couldn’t text or take a photo that he could stick a nice Polaroid filter on. Science fiction didn’t see the mobile phone coming. It certainly didn’t see the glowing glass windows many of us carry now, where we make amazing things happen by pointing at it with our fingers like goddamn wizards.\n\n\"...The central metaphor is magic. And perhaps magic seems an odd thing to bring up here, but magic and fiction are deeply entangled, and you are all now present at a séance for the future.\"\n\n- Warren Ellis, [How to see the Future](http://www.warrenellis.com/?p=14314)",
      tags: [0,1,2]
    },
    {
      body: "Here is my todo list of things to implement in Nutmeg in the very near future:\n\n- Customizeable programmatic tagging\n- Sharing and live collaboration\n- Customizeable layouts\n- Fix weird font sizes\n- Responsive design: usable on all different sizes of devices\n- Any design at all\n- SSL\n- Private notes\n\nPotential avenues for future feature-bloat:\n\n- Tag jiggery\n  - (Auto-suggested) tag relationships, sequences, and modifiers\n  - Auto-tagging and API for programmatic tagging - tagging based output of arbitrary functions, like...\n    - Classifiers trained on what you've tagged so far\n    - Sentiment analysis and other computational linguistics prestidigitation like unusual concentrations of domain-specific words\n    - # or % of lines matching given regex\n    - Categorizations like the Flesch Reading Ease test\n    - Whatever your little heart desires\n- Markdown, Vim, syntax highlighting, and WYSIWYG support\n- Integration with...\n  - Email\n  - Instant messaging protocols\n- Shortcuts and visualizations for non-linear writing - think LaTeX meets [XMind](http://www.xmind.net/)\n- Plugin API and repository\n- Autodetecting (encouraging, formalizing, visualizing) user-generated on-the-fly syntax\n- Media support\n- Life logging\n- Exporting, web-hooks, integration with: IFTTT, Zapier, WordPress...\n- Legend/You Are Here minimap",
      tags: [1]
    },
    {
      body: "Hey, welcome to Nutmeg. These are your personal notes, accessible by you from anywhere. Here are some things you can do with Nutmeg:\n\n- Write notes\n- Tag notes\n- Everything is synced to the cloud within seconds: you write, it's saved, kind of like paper.\n- See and edit your notes from any device\n- Instant searching through your notes, by tag and by keyword\n\nYou can delete notes by hitting the trash can in the top right of each note. You can figure out how to edit and delete tags.\n\nNutmeg is under active development, so bear with me on any weirdness. In the menu in the lower right corner of the screen you can log out, view/customize keyboard shortcuts, and submit any bug reports, feature requests, or thoughts as feedback, which I hope you do.",
      tags: [1]
    }]);
  }

  function newSessionStarted(newUserChild) {
    if (newUserChild.key() !== 'lastLogin') return;

    // lastLogin changed on $s.ref.child('user')
    console.warn('nutmeg session started from elsewhere at ' + newUserChild.val() + '!');

    $s.m.lockedOut = true; // prevent user from closing the following modal
    $s.m.alert({
      bodyHTML: "<p>Hey, it looks like you've logged into Nutmeg from another device or browser window.</p><p>Nutmeg doesn't yet support editing from multiple sessions at the same time. Please <a href='#' onclick='document.location.reload()'>refresh</a> this window to load any changes made in other sessions and continue.</p>",
      ok: false,
      large: true
    });
  }

  $s.submitFeedback = function(feedback, name) {
    console.log("calling submitFeedback()");
    if (!feedback) {
      alert("You forgot to enter any feedback.");
      return false;
    }

    new Firebase('https://nutmeg.firebaseio.com/feedback/').push({
      'feedback': feedback,
      'timestamp': new Date().toString(),
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
  // HACK: i'm now using this all the time, i don't understand angular enough to do various things properly, sorry
  window.nmScope = angular.element("body").scope();

}]) // end of Nutmeg controller

.directive('nmFocus', ['$timeout', function($timeout) {
  return function(scope, element, attrs) {
     scope.$watch(attrs.nmFocus, function (newValue) {
        // not sure why $timeout is necessary here, but seems like otherwise input gets focus BEFORE ng-show on parent <li> kicks in
        $timeout(function() {
          newValue && element[0].focus()
        }, 0);
     });
  };
}])
.directive('nmQuery', function() {
  return function(scope, element, attrs) {
    scope.$watch(attrs.nmQuery, function(newQ) {
      nmScope.q.doQuery();
    });
  };
})
.directive('nmNut', function() {
  // in link and controller here, $s appears to be its own isolated scope but containing properties pointing to all of properties in [parent?] Nutmeg controller $s. e.g. $s != window.nmScope, but $s.n == window.nmScope.n && $s.t == window.nmScope.t, etc...
  return {
    restrict: 'E',
    templateUrl: 'nm-nut.html',
    link: function postLink($s, el, attrs) {
      if (attrs.nutId && $s.n.nuts) {
        $s.nut = $s.n.nuts[$s.$eval(attrs.nutId)];
      }
      // otherwise rely on/assume `nut` is already in scope, e.g. via ng-repeat
    },
    controller: ['$scope', '$element', '$timeout', function($s, $el, $timeout) {
      // takes what's in $s.addTagName (or addTagNameOverride) and adds it to this nut
      $s.addTag = function(returnFocusToNut, addTagNameOverride) {
        var tagName = addTagNameOverride || $s.addTagName;
        if (tagName) {
          var tagId = $s.t.getTagIdByName(tagName);

          if (tagId === -1) {
            console.log("creating new tag " + tagName);
            tagId = $s.t.createTag({name: tagName});
          }

          if (!$s.nut.tags) $s.nut.tags = []; // firebase doesn't store empty arrays/objects, so create it here
          if ($s.nut.tags.indexOf(parseInt(tagId)) !== -1) {
            console.log("tag "+tagName+" already exists on nut "+$s.nut.id);
          }
          else {
            $s.n.addTagIdToNut(tagId, $s.nut.id);
          }
          $s.addTagName = '';
        }
        if (returnFocusToNut) {
          $s.focus();
        }

        $s.closeAddTagField();
      };
      $s.openAddTagField = function() {
        $(window).click($s.closeAddTagField);

        $s.autocomplete($("#nut-"+$s.nut.id+" .tags input"), $s.nut);
        $s.addingTag = true; // this will automatically show the field and put focus on it
      };
      $s.closeAddTagField = function closeAddTagField() {
        $(window).off('click', $s.closeAddTagField);

        $timeout(function() {
          $s.addingTag = false; // will automatically hide field
          $("#nut-"+$s.nut.id+" .tags input").autocomplete('dispose');
        })
      };

      $s.togglePrivate = function togglePrivate() {
        $s.nut.private = ! $s.nut.private;
        $s.n.nutUpdated($s.nut, false, false); // TODO: 3rd param should be true, to update prog tags, in case prog tag checks private status... but i don't want to slow things down with index and prog tag update when you click private icon. when we have web workers, then do full update
        if (! $s.p.privateMode) {
          // private mode is off, so we need to filter which notes to show:
          $s.q.doQuery();
        }
      }

      $s.focus = function() {
        $timeout(function() {
          $($el).find("textarea")[0].focus();
        }, 5);
      }
    }]
  };
})
.directive('nmTag', function() {
  return {
    restrict: 'E',
    templateUrl: 'nm-tag.html'
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

function arrayIntersect(a1, a2) {
  return a1.filter(function(n) {
    return a2.indexOf(n) != -1;
  });
}
// takes array of arrays
function multiArrayIntersect(arrays) {
  if (arrays.length == 0) return [];
  else {
    var soFar = arrays[0].slice(); // start with the 0th. slice() to duplicate array, otherwise in the case of arrays.length==1 we end up returning a reference to that array
    for (var i = 1; i < arrays.length; i++) { // then with the first
      soFar = arrayIntersect(soFar, arrays[i]);
    };
    return soFar;
  }
}

/** firebase paths can't contain: ".", "#", "$", "[", or "]" */
function formatForFirebase(s) {
  // just base64 encode it eh
  return btoa(s);
}