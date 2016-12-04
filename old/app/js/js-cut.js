/* jshint ignore:start */ // TODO actually clean up
"use strict";

console.time('pre login');

angular.module('nutmeg').controller('Nutmeg', [
  '$scope',
  '$timeout',
  '$interval',
  '$sce',
  'fuzzyMatchSort',
  'progTagLibrary',
function (
  $s,
  $timeout,
  $interval,
  $sce,
  fuzzyMatchSort,
  progTagLibrary
) {


  var PROG_TAG_EXAMPLES = [
    // DONE
  ];


  $s._ = _; // make lodash available to view template

  $s.m = {
    // DONE
  };
  $s.$watch('m.modal', function(newVal) {
    // DONE
  });

  $s.digest = {
    // DONE
  };

  // user authentication
  $s.u = {
    // when loading and !loggedIn, "go" button for login and createaccount is replaced with loading spinner
    // when loading and loggedIn, notes of already-logged-in user are loading, and full-page loader is shown
    loggedIn: false,
    loggingIn: false, // different loading animation while logging in
    loading: false,

    createAccount: function(email, pass1, pass2) {
      // DONE
    },

    forgotPassword: function() {
      // DONE
    },

    changePassword: function() {
      // DONE
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
      // DONE
    },

    pseudoLogin: function(email, password) {
      // DONE
    },

    auth: new FirebaseSimpleLogin(new Firebase('https://nutmeg.firebaseio.com/'), function(error, user) {
      // DONE
    })
  }; // end $s.u - user account stuff

  // will be populated with map from user UIDs to their display name
  $s.users = {
    /** go through all our tags and fetch display names of any users we're sharing stuff with */
    fetchShareRecipientNames: function() {
      var uids = [];
      _.each($s.t.tags, function(tag) {
        if (tag.share) {
          uids = uids.concat(_.keys(tag.share));
        }
      });

      $s.users.fetchUserDisplayNames(_.uniq(uids));
    },

    fetchUserDisplayNames: function(uids, cb) {
      console.time('fetching ' + uids.length + ' users\' display names');
      async.each(uids, $s.users.fetchUserDisplayName, function(err) {
        console.timeEnd('fetching ' + uids.length + ' users\' display names');
        if (cb) cb(err);
      });
    },

    fetchUserDisplayName: function(uid, cb) {
      var fallbackName = uid.replace('simplelogin:', 'user #');
      if ($s.users[uid] && $s.users[uid] !== fallbackName) {
        // we already fetched it
        return cb(null, $s.users[uid]);
      }
      $s.users[uid] = fallbackName; // something to display if user sees this before data comes in or if request fails

      if (uid === $s.u.user.uid) {
        // ourselves
        $s.users[uid] = $s.u.user.displayName;
        return cb(null, $s.users[uid]);
      }

      $s.ref.root().child('users/' + uid + '/user/displayName').once('value', function(data) {
        $s.users[uid] = data.exists() ? data.val() : fallbackName;
        return cb(null, $s.users[uid]);
      }, function(err) {
        console.error('failed to get display name for user ', uid, err);
        cb(err, fallbackName);
      });
    }
  };

  // DONE (lunr init)

  // ==== NUT STUFF ==== //
  $s.n = {
    // PARTIALLY DONE

    runProgTags: function(nut) {
      // DONE
    },

    /**
     * takes one note loops through all its tags and updates sharing info here accordingly (for firebase security rules convenience). 
     * TODO: right now this doesn't run nutUpdated, because it gets called from stuff (like removeTagIdFromNut) that also calls nutUpdated, so it can get ridiculous... need a debounce function that understands/aggregates arguments so that we can safely call it from here
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
      console.time('autosizing all nuts');
      angular.element('.nut textarea').each(function(i, ta){
        $s.n.autosizeNutByEl(ta);
      });
      console.timeEnd('autosizing all nuts');
    },

    /** autosize all except the first `skip` nuts */
    autosizeSomeNuts: function(skip) {
      if (! parseInt(skip)) throw new Error('invalid argument: ' + skip);

      console.time('autosizing some nuts');
      $('.nut:nth-child(n+' + skip + ') textarea').each(function(i, ta){
        $s.n.autosizeNutByEl(ta);
      });
      console.timeEnd('autosizing some nuts');
    },

    // hack, needed because ngChange doesn't pass element
    autosizeNutById: function(id) {
      this.autosizeNutByEl(document.getElementById("nut-"+id+"-ta"));
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
  };


  // ==== PRIVACY STUFF ==== //

  // DONE

  // ==== QUERY STUFF ==== //

  // DONE


  // ==== TAG STUFF ==== //

  $s.t = {
    // PARTIALLY DONE

    tagProgSettings: function(tag) {
      // DONE
    },
    getTagProgFuncString: function(tag) {
      // DONE
    },
    runProgTagOnAllNuts: function(tag) {
      // DONE
    },
    runProgTagOnNut: function(tag, nut, classifier) {
      // DONE
    },
    progTagGetClassifier: function(tag) {
      // DONE
    },
    progTagError: function(tag, err) {
      // DONE
    },
    progTagCantChangeAlert: function(tag) {
      // DONE
    },

    /** tag has a `share` object that maps `uid` to permission ('r' for readonly, 'w' for read/write) */
    sharingSettings: function(tag) {
      if (tag.sharedBy) {
        // this is shared from someone else
        // TODO open up share info, offer to delete, etc.
        return;
      }

      if (_.isEmpty(tag.share)) {
        // tag not currently shared with anyone, so do simple share prompt:

        // there are several points at which sharing can fail, so define what happens here:
        var failed = function(userSearchQuery, err) {
          console.warn('error trying to find user by email "' + userSearchQuery + '":', err);
          alert('No Nutmeg user found with email "'+ userSearchQuery +'"'); // TODO something about inviting them
          $timeout(function() {
            $s.m.working = false;
            $s.t.sharingSettings(tag);
          }, 50);
        }

        var permission = 'r'; // read only is all we can do for now

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
                $s.m.working = false;
                if (data.exists()) {
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

                        $s.t.shareTagWithUser(tag, recipientUid, permission);
                      }
                    });
                  }
                  else {
                    $s.t.shareTagWithUser(tag, recipientUid, permission);
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
        $s.m.alert('Tag "'+ tag.name +'" has been unshared with ' + $s.t.getSharedWithNames(tag));
        $s.t.unshareTagWithAll(tag); // TODO for now just get rid of it
      }
    },

    getRecipientTagSharePath: function(tag, recipientUid) {
      return 'users/' + recipientUid + '/sharedWithMe/tags/' + $s.u.user.uid + '/' + tag.id;
    },

    shareTagWithUser: function(tag, recipientUid, permission) {
      async.parallel([
        function(cb) {
          // mark in the *recipient*'s data that we've shared this tag with them
          var recipientTagSharePath = $s.t.getRecipientTagSharePath(tag, recipientUid);
          $s.ref.root().child(recipientTagSharePath).set(permission + '?', cb); // '?' indicating they need to accept - recipient will remove the '?' and accept or decline
        },
        function(cb) {
          $s.users.fetchUserDisplayName(recipientUid, cb);
        }
      ], function shareTagWithUserCb(err) {

        if (err) {
          console.err('failed to share tag', tag, 'with user', recipientUid, err);
          alert('An error occured while attempting to share this tag, please try again later.\n\n' + err);
          $s.m.closeModal();
          return;
        }

        if (!tag.share) tag.share = {};
        tag.share[recipientUid] = permission;
        $s.t.tagUpdated(tag);

        $s.t.updateNotesShareInfo(tag);

        $s.m.closeModal(); // HACK: otherwise text isn't vertically aligned on the upcoming alert
        $timeout(function() {
          $s.m.working = false;
          $s.m.alert({
            message: 'Now sharing tag "'+ tag.name +'" with '+ $s.users[recipientUid]
            // TODO: should be "ok" or "go to sharing settings"
          });
        }, 50);

      });
    },

    unshareTagWithUser: function(tag, recipientUid) {
      // mark in the *recipient*'s data that they should delete this tag
      var recipientTagSharePath = $s.t.getRecipientTagSharePath(tag, recipientUid);
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

    /** currently gets called by view on mouseover of share icon */
    setShareTooltip: function(tag) {
      // TODO this is un-angular-ish i think, but more efficient than setting watchers on tag.share/tag.sharedBy of every tag... what's the best way here?

      if (! tag.share || _.isEmpty(tag.share)) {
        tag.shareTooltip = 'share this tag';
      }
      else if (tag.sharedBy) {
        tag.shareTooltip = $s.users[tag.sharedBy] + ' is sharing this with you';
      }
      else {
        tag.shareTooltip = 'sharing with ' + $s.t.getSharedWithNames(tag);
      }
    },
    getSharedWithNames: function(tag) {
      return _.map(tag.share, function(perm, uid) {
        return $s.users[uid];
      }).join(',');
    },

    tagUpdated: function(tag, updateNut, updateModified) {
      // DONE
    }

  }; // end of tags

  $s.autocomplete = function(el, nut) {
    // DONE
  }

  // ==== KEYBOARD SHORTCUTS ==== //
  $s.s = {
    // DONE
  }; // end $s.s - shortcuts

  // ==== CONFIGURATION ==== //
  $s.c = {
    // DONE
  };

  function initData(uid) {
    // DONE
  }

  /** some remaining stuff (like initializing shared notes) may continue to initialize asynchronously, but call this function when the application is usable */
  function initUI() {
    // DONE
  }

  function sharedWithMeInit(shareInfo) {
    if (_.isEmpty(shareInfo) || _.isEmpty(shareInfo.tags)) return;
    console.log('sharedWithMeInit: starting initializing shared stuff');
    console.time('sharedWithMeInit: intializing shared stuff');

    // level 0. shareInfo.tags has sharerUid -> tagId - > permission, so we can build a list of tag paths
    var sharedTagInfo = []; // will fill with objects like {uid: 'simplelogin:....', path: 'users/...', permission: 'r'}
    var userUids = []; // so we can map to display names
    var confirmationRequired = false; // whether at least 1 shared tag needs confirmation

    _.each(shareInfo.tags, function(tagsFromThisUser, sharerUid) {
      userUids.push(sharerUid);
      _.each(tagsFromThisUser, function(permission, tagId) {
        if (!permission) return; // firebase treating this as an array not an obj, and it's sparse...

        if (permission === 'r?') confirmationRequired = true;

        sharedTagInfo.push({
          uid: sharerUid,
          path: 'users/' + sharerUid + '/tags/' + tagId,
          permission: permission
        });
      });
    });

    $s.users.fetchUserDisplayNames(userUids); // asynchronous and we don't really care when it comes back

    // if "user wants to share tag with you, okay?" confirmation is needed for at least one share, we have to do this in series - if we didn't do in series they'd all override each other. anything that doesn't require confirmation could be done in parallel but if we have mixed ones, whatever
    var asyncFunc = confirmationRequired ? 'eachSeries' : 'each';

    // now we need to fetch each tag (level 1). each tag has a list of docs. so then we need to fetch *each* of those nuts (level 2).
    async[asyncFunc](sharedTagInfo, function(tagInfo, cb) {
      fetchSharedTag(tagInfo.path, tagInfo.uid, tagInfo.permission, cb);

    }, function(err) {
      if (err) console.error('sharedWithMeInit: error while initializing shared stuff:', err);
      else console.log('sharedWithMeInit: done initializing shared stuff');
      console.timeEnd('sharedWithMeInit: intializing shared stuff');

      $s.q.doQuery(); // will add new notes to n.nutsDisplay and sort them
    });
  }
  // level 1a: grab shared tag info
  function fetchSharedTag(tagPath, sharerUid, permission, cb) {
    if (permission === 'd?' || permission === 'd') { // TODO which are we using?
      // TODO delete it
      // no need to fetch the tag
      return cb();
    }

    console.log('sharedWithMeInit: fetching shared tag info from', tagPath);

    $s.ref.root().child(tagPath).once('value', function(data) {
      if (! data.val()) return cb(new Error('fetched tag is empty'));

      initSharedTag(data.val(), sharerUid, permission, cb);
    }, function(err) {
      console.error('sharedWithMeInit: failed to fetch tag from', tagPath);
      cb(); // not passing the error in - we can continue
    });
  }
  // level 1b: decide what to do with shared tag based on permission
  function initSharedTag(tag, sharerUid, permission, cb) {
    if (permission === 'r?') {
      // sharer is requesting to share something with us as read-only

      // first get their display name (NOTE: this may produce duplicate requests since we called fetchUserDisplayNames with all sharer UIDs in sharedWithMeInit. request may have come back already in which we can get it from local cache. if not, there will be. alternative is to not call initSharedTag until after fetchUserDisplayNames is done, which will sometimes needlessly makes the process longer. proper option would be to detect if it's a new user (requiring us to display this dialog) and fetch just those display names before calling this, fetching others in the background)
      $s.users.fetchUserDisplayName(sharerUid, function(err) {
        $s.m.confirm({
          bodyHTML: '<p>' + $s.users[sharerUid] + ' wants to share the tag "' + tag.name  + '" with you.</p><p>How does that sound?</p>',
          okText: 'great',
          okCb: function() {
            $s.ref.child('sharedWithMe/tags/' + sharerUid + '/' + tag.id).set('r'); // remove the ?

            handleSharedTag(tag, sharerUid, permission, cb);
          },
          cancelText: 'no thanks',
          cancelCb: function() {
            declineSharedTag(sharerUid, tag); // aw

            cb(); // onwards
          },
        });
      });
    }
    else if (permission === 'r') {
      handleSharedTag(tag, sharerUid, permission, cb);
    }
    else {
      // uh
      cb();
    }
  }
  // level 1c: get nut ids from a shared tag and load nuts
  function handleSharedTag(tag, sharerUid, permission, cb) {
    var nutPaths = [];

    _.each(tag.docs, function(nutId) {
      nutPaths.push('users/' + sharerUid + '/nuts/' + nutId);
    });

    async.each(nutPaths, function(nutPath, _cb) {
      initializeSharedNutFromPath(nutPath, sharerUid, _cb);
    }, function(err) {
      return cb(); // not passing any error in, we can continue
    });

    createLocalSharedWithMeTag(tag, sharerUid);
  }
  // level 2: get the actual nuts
  function initializeSharedNutFromPath(nutPath, sharerUid, cb) {
    console.log('sharedWithMeInit: fetching shared nut from', nutPath);

    $s.ref.root().child(nutPath).once('value', function(data) {
      if (! data.val()) return cb(new Error('fetched nut is empty'));

      cb();
      createLocalSharedWithMeNut(data.val(), sharerUid);
    }, function(err) {
      console.error('sharedWithMeInit: failed to fetch nut from', nutPath);
      cb(); // not passing the error in, we can continue
    });
  }

  /** given another user's tag, handle special local version of that tag for this user */
  function createLocalSharedWithMeTag(tag, sharerUid) {
    var localTagId = sharerUid + ':' + tag.id;
    tag.id = localTagId;
    if (tag.docs) {
      tag.docs = tag.docs.map(function(docId) {
        return sharerUid + ':' + docId; // because sharer's doc IDs might collide with ours
      });
    }
    tag.readOnly = true; // TODO handle other permissions
    tag.sharedBy = sharerUid; // TODO get user's display name

    // all the other fields set on the tag by the sharer we can leave as is

    // TODO how to handle if sharer has set it as private? and we should be able to have private/not private ourselves, probably

    if (! $s.t.tags[localTagId]) $s.t.tags[localTagId] = {};
    _.extend($s.t.tags[localTagId], tag);

    $s.t.tagUpdated(localTagId, false, false);
  }

  /** given another user's nut, handle special local version of that nut for this user */
  function createLocalSharedWithMeNut(nut, sharerUid) {
    var localNutId = sharerUid + ':' + nut.id;
    nut.id = localNutId;
    nut.tags = nut.tags.map(function(tagId) {
      return sharerUid + ':' + tagId; // because sharer's tag IDs might collide with ours
    })
    .filter(function(tagId) {
      // we only want sharer's tags that are also on our system
      // NOTE: createLocalSharedWithMeTag() for the tag whose sharing introduced this note should have been called before this, because it runs synchronously from the code path that asynchronously results in createLocalSharedWithMeNut(), so sharer's tags should already exist locally. however TODO there is an edge case where sharer has multiple tags on this note which are also shared with this user, one of which has been handled but the other which has not, so one tag could go missing...
      return !! $s.t.tags[tagId];
    });

    nut.readOnly = true; // TODO handle other permissions
    nut.sharedBy = sharerUid; // TODO get user's display name

    // no need to save entire body on our end too
    nut.sharedBody = nut.body; // sharedBody is ignored in digest
    nut.body = null;

    // all the other fields set on the nut by the sharer we can leave as is

    // TODO how to handle if sharer has set it as private? and we should be able to have private/not private ourselves, probably

    if ($s.n.nuts[localNutId]) {
      // _.extend will overwrite arrays, so before we do that, preserve and tags we've locally added to this shared note
      $s.n.nuts[localNutId].tags = $s.n.nuts[localNutId].tags.filter(function(tagId) {
        // remove any tags on this note that belong to the sharer. they might have changed, and even if they haven't, we'll merge them back in in a sec:
        return tagId.indexOf(sharerUid) !== 0;
      });
      nut.tags = _.union(nut.tags, $s.n.nuts[localNutId].tags);
    }
    else {
      $s.n.nuts[localNutId] = {};
    }

    _.extend($s.n.nuts[localNutId], nut);

    $s.n.nutUpdated(localNutId, false, true);

    // need to run `doQuery` because any newly added/updated shared notes won't be in `$s.n.nutsDisplay`. however, createLocalSharedWithMeNut could get called dozens of times or more, so do a slow debounced function to not overwhelm with a filter sort resize and digest each time
    $s.q.slowDebounceDoQuery();
  }

  function declineSharedTag(sharerUid, tag) {
    $s.ref.child('sharedWithMe/tags/' + sharerUid + '/' + tag.id).remove();

    // TODO also write something into sharer's info so they know it was declined?
  }

  function firstInit() {
    // DONE
  }

  $s.submitFeedback = function(feedback, name) {
    // DONE
  };

  // handy for accessing and playing with things from console while debugging
  // HACK: i'm now using this all the time, i don't understand angular enough to do various things properly, sorry
  window.nmScope = angular.element("body").scope();

}]) // end of Nutmeg controller

.directive('nmQuery', function() {
  // DONE
})
.directive('nmNut', function() {
  // in link and controller here, $s appears to be its own isolated scope but containing properties pointing to all of properties in [parent?] Nutmeg controller $s. e.g. $s != window.nmScope, but $s.n == window.nmScope.n && $s.t == window.nmScope.t, etc...
  return {
    restrict: 'E',
    templateUrl: 'nm-nut.html',
    controller: ['$scope', '$element', '$timeout', function($s, $el, $timeout) {
      // PARTIALLY DONE

      $s.activateNut = function() {
        $el.addClass('active');
        $(window).on('click', $s.maybeDeactivateNut);
      };
      $s.deactivateNut = function(e) {
        $el.removeClass('active');
        $(window).off('click', $s.maybeDeactivateNut);
      }
      $s.maybeDeactivateNut = function(e) {
        if (! $el[0].contains(e.target)) {
          // user clicked outside this nut, so deactivate
          $s.deactivateNut();
        }
      };
    }]
  };
})
.directive('nmTag', function() {
  // DONE
});


// ==== RANDOM GLOBAL UTILITIES ==== //

// DONE
