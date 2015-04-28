l = lunr(function () {
  this.field('body', {boost: 1});
  this.ref('id');
})
l.update({"body":"yo some words", "id": 0})
l.search("word") // returns one result
l.search("some") // returns no results - is "some" just a stop word? if so, and l.search("some word") works, we're good


## TODO

### shared notes

##### share settings modal mockup

    # sharing with others

    quote (4)
    -----------------
    [search for user by email or name](autocompletes with friends)
    +

    futurism (1)
    -----------------
    spoon           x
    fiasco          x

##### sharing structure

- sharer has in each tag (and duplicated in each note) a `sharer` child object with {'simplelogin:23': 'r', 's...': 'w'} for read write. recipients can read all info about these tags (to find which notes) and notes themselves.
- recipient has /user/uid/sharedWithMe/tags/sharer-uid/tag-id/r|w|x|d. this is set by the *sharer*. recipient can look in /user/uid/sharedWithMe to get all info about stuff shared with them
- recipient creates tags and notes on their end. their IDs are `uid:tagId/noteId`
    - both tags and notes:
        - have sharer-set `shared[$s.u.user.uid]` set to the permission ('r', etc) for detecting it's shared
        - have `readOnly` attribute if appropriate
        - created/updated on startup
        - have a permanent presence in recipient's documenter similar but different to regular notes/tags
    - tags
        - all fields (except make private) are locked: names, docs (can't be added/removed), prog, timestamps
        - when created/updated, each id in `docs` gets prefaced with their uid + ':'
    - notes 
        - blank body, and sharedBody that gets pulled in on load, and *doesn't* get saved by digest
        - `tags` has `uid:tagid` in it, and can't be removed, but other than that user controls tags
        - user controls privacy
        - timestamps get updated
        - `share` is removed
- permissions:
    - sharer creates value with '?' on the end, which recipient removes when they've accepted
    - 'r' read only
        - textarea grayed out a bit on recipient
        - if recipient adds sharing tag to read-only shared note, tag's chiclet on that note has group icon with strikethrough and tooltip text 'Normally you are sharing all notes taged with "' + tag.name + '" with ' + BLAHSHARERECIPIENTS + '. However, this note was shared by ' + BLAHUSER + ' with you as read-only, so you cannot share it onwards with others'. UNLESS it's shared only back with the sharer, in which case... just leave the icon as normal
        - if sharer unshares or deletes tag, they get removed from recipient
    - 'w' read/write.
        - can recipient share onwards?
        - what happens if note owner deletes or unshares?
            - a: gone without a trace from recipient (sucks)
            - b: goes into some kind of read-only, still-unshareable mode, 'owner of this note as delete the note or unshared it with you. the latest version is archived here BLAH' and some kind of strikethrough/grayed out shared tag
            - c: some kind of forked thing where it graduates to 'your' note...?
    - 'x' admin
        - only necessary if recipient of 'w' *can't* share or depending on 'w' behavior of sharer deleting/unsharing
    - 'd' deleted. only found in recipient's /user/uid/share document, indicates recipient should update their sharing info accordingly, and then can delete the 'd' record

##### soon

- collaborative editing:
    - http://www.firepad.io/docs/
    - https://github.com/firebase/firepad/tree/master/examples/security
- "don't ask me again for [user]" response to request (which means we need notifications...)
- specify in share request that it's read-only/one-way
    - 'Shared notes and tags show up alongside your personal notes and tags, but with the [person] icon. You can modify (add your own tags, set to private, etc.) shared notes as normal.'
- on init share stuff, don't tagupdated and sync to firebase if nothing changed
- @name system tag
    - there are 3 potential uses. @name shared with me, i shared with @name, and this is about @name (but maybe i don't want to share it with them)...
- ability to select single note to share (essentially adding that system tag)
- sharer removes:
    - recipient sees the x, and delete's local tag notes and the 'x'
    - sharer removes just one tag... we'd end up with a shared tag with no `sharedBody`, maybe just clean up after share init callback?
- recipient removes:
    - if user tries to delete note someone shared with them: 'This note is in your Nutmeg because USER has shared their tag "TAGNAME" with you. To delete it, remove this shared tag.'
        - OK
        - Change sharing settings
    - if user tries to delete shared tag, similar message as above
    - if they unshare or decline initial request: write nulls (delete) into tags and notes of sharer?
    - same idea if they decline initial request
- duplicate note tags removes shared tags from new note, same with query bar
- sharing settings. window that breaks down by tag > person or person > tag (or checkbox/radio to control which view?)
    - my tags shared with others
    - others' tags shared with me
    - indicating read-only or edit, which can be changed for your sharing
- if you click on sharing icon of tag and you're already sharing, open sharing settings and scroll to (and highlight?) it
- add share recipient (from wherever)
    - search (by email address or user name) or choose from past sharers/recipients
        - if no user found AND if it's a valid email address "No Nutmeg user found. Would you like to email EMAIL and invite them to join Nutmeg?" <-- not ready yet ugh this is a whole flow
    - choose read-only or can-edit
    - 'USER will be able to see/edit all notes tagged with "TAGNAME", including notes that you later add this tag to. Are you sure?'
        - yes
        - yes, don't ask me again
        - no
- edit permissions
    - investigate firepad for storing/transmitting note and live collaboration
        - does note live with "owner" or in a separate collection?
        - modify security permissions so user A can access (some of) user B's notes
- **LATER**:
    - instead of the user(s) icons on tags for sharing, maybe show tiny (b&w?) avatar or initials? how to differentiate shared by and shared with?
    - keep track of "friends"? (people you've shared something with or they've shared with you). global id, populated on app startup with their name
    - sharer shares a prog tag. recipient sees sharer's notes that were programatically tagged. does it also programamtically tag recipient's notes? i guess the more general question is whether the recipient can apply a sharer's tag to their own nets. note merging etc...
    - should private notes be shared? they currently are
    - what if user A shares something with user B, and user B tags a note with a tag they're sharing with user C?
        - if A -> B is read-only, B shouldn't be able to "forward" the share
        - if A -> B is editable, we have collaborative editing between multiple people, pass on appropriate IDs...
        - question. either:
            - when sharing something with someone so they can edit, say "USER will also be able to share your shared notes with others", OR
            - 3 levels of sharing: read-only, edit, admin. only admin can share forward
        - user A should be able to see that a certain note is ALSO visible by user C...
    - should tagging shared notes also be shared? eh. prob not.
    - email notifications when user shares something with you (first time from that user only?).
        - some special link so that it highlights shared tag(s) to you...
    - search for only notes shared with you/notes you shared with others
    - block user
    - instead of share recipients storing their local info about shared notes/tags in their document store, maybe have them store it in the sharer's version of the document? security rules could let users write into `nuts[id].share[shareRecipientUid]` (only if it was already pre-propulated cause that's where permissions live, or maybe they just can't write to the permissions key). then the recipient's digest needs to understand where to write stuff to if ID begins with 'simplelogin:' etc.

### todo for beta

##### notable features

- intro page with a tiny bit of info and demo
    - demo: set some variable which basically disables digest (replaces it with dummy?). make sure to have an alert saying "WARNING: none of the changes you make here will be saved"
        - ideally, when you create an account, it is saved?
- mobile responsive
- shared notes
    - live collab
- programmatic tags
    - more examples and example UI

##### minor features

- continue redesign
    - style select boxes
    - better colors
    - input in new tag/add tag looks crap
    - make sure tooltips are visible
    - tag panel goes all the way down? or separately scrollable? (would make it hard to scroll down notes cause of textareas)
    - themer
        - colors
        - bg image
    - sloping/cut-off/diagonal tags?
        - one of these rotates and hides overflow, that's the only one that works with interesting foreground and background i think:
        - http://tympanus.net/codrops/2011/12/21/slopy-elements-with-css3/
        - http://stackoverflow.com/questions/11074601/diagonal-wedge-shaped-css-edge-to-edge-centered-in-browser
        - http://stackoverflow.com/questions/7324722/cut-corners-using-css
        - http://jsfiddle.net/webtiki/c7h0vrwh/
    - @ui-bg is behind note/tag search fields... could maybe use this clever border method http://jsfiddle.net/VRLNJ/2/
- new user welcome email
    - reverse DNS etc. mostly done with SES i think? go into AWS and add email addresses under verified senders. it says DKIM verification status if failure
- better nutmeg logo
- favicon
- make it not run slowly (like when autosizing)
    - maybe use `slyPreventEvaluationWhenHidden` https://github.com/scalyr/angular/blob/3f1cbbba31689339694bd2132e411ca2eabb9480/src/js/directives/slyEvaluate.js
    - https://www.airpair.com/angularjs/posts/angularjs-performance-large-applications
    - one-way data binding?
- create account by invite only + 'request invite' button
    - basically give a unique URL like nutmeg.io?invite=somethingcute
    - with login, if invite query param exists and matches again firebase array i've hand-added, then show create account (nicer welcome message) and then update firebase with this invite being taken
- move note actions into menu?
- alert to unsaved changes if you close window
- font
- status messages for loading stuff
    - function 'update status message' after various key stages, which chooses a random one
    - loaded from firebase so it's not in JS source and harder to see?
    - see `loading-messages.md`
- "active" state for nuts instead of focus, so that you can activate readonly notes and so that if you click on another window, area stays opened

##### bits and bugs

- bug: prompt isn't focusing on field again
- show tag icons (prog, shared) in query bar?
- bug: esc when in nut textarea immediately returns focus back to nut textarea
- enter or spacebar should exit alert modals
- logout should clear nuts and stuff from scope etc!
- mention in firstInit() notes something about if you're interested then... or if you want to help out
- @nutmeg.io email address. I have support@ (and toby@ and ece@), what about for general stuff? contact@ is boring
- space at bottom of page?
- why doesn't it remember my username and password?

### todo next

##### notable features

- "star"
- tag browser collapse/expand
- SSL
    - http://engagingcomms.com/Easy-way-to-Configure-SSL-for-Amazon-S3-bucket-via-Cloudflare-115
- FAQ

##### minor features

- issues connecting to firebase
    - somehow listen for connection/disconnection and alert user and change cloud to red
    - maybe set some time in `push()`, and if `pushHackCounter>0` in `push()`, and if some length of time has passed (like 30s) then alert user and suggest something
    - https://www.firebase.com/docs/managing-presence.html
- 'security' or 'privacy' settings section
    - ask password for viewing private notes - default on
    - ask password for programmatic notes - default off
    - report anonymous statistics - default on (nicer name)
    - hidden user - default off. when on, other nutmeg users can't search for you by email or username in order to share things with you must... what? share something with them? what if you don't want to? "friend" them?
- highlight and scroll to matched query in search results
- private note/tags improvements
    - see "private notes/tags" section below
    - tutorial-ish stuff:
        - permanently-dissmissable message when turning on private mode:
            - 'You have enabled "private" mode. All tags you have marked as "private" will be visible.\n\nThis mode will remain enabled until you close this window or switch it off manually.'
        - perm-diss when switching on private on note/tag
            - 'You are setting this note/tag as "private". It will be hidden from view unless you select "private mode" from the menu' OK/OK don't show again/cancel
    - tag-wide. instead of note-level private flag, check if union of privateTags and note tags is not empty
        - note level private click adds special "private" tag
            - check tags structure, is negative value ok?
            - add "show system tags" setting to show untagged or private
        - make tag private/unprivate
            - add/remove from privateTags list
        - if you un-private a note which has a private tag, remove system tag "private" but then ask: 'You have selected to make this note not private, but it has the tag "TAG", which is private. What would you like to do?'
            - 'Leave this note private'
            - 'Remove "TAG" tag'
            - 'Make all "TAG" notes not private'
        - transform existing data, right?
        - hide tag itself from list when not in private mode (and display similar (sharing optout flag though?) message 'You are setting this tag as private, will be hidden...' as enabling private mode on note)
    - auto-expiration of private mode? like, x minutes turn it back off
- programmatic tags
    - whitelist and blacklist so you can add/remove tag from notes despite programmatic
    - async option where cb is passed in
    - warning somewhere: Be careful of infinite loops. If this tag "a" function adds or removes a tag from a note, that note is run through all tag functions again (in case some tag "b" function would classify differently based on added/removed tag). If tag "a" functions returns a *different* answer in its second run, an infinite loop is possible.
        - ugh example maybe with two tags "has more than 3" and "has less than 4" or something where they keep changing each other
        - "untagged" is a great example - it'll add, then remove, then add...
- wrap all firebase calls with something that has a default CB with message for failure, logs the error upstream, etc.
- exclude (with either - or NOT) search keywords or tags
    - when preceded with -/NOT, tag autocomplete prepends each autosuggestion with grayed out "exclude"

##### bits and bugs

- disable user select on tags so that you can shift click
- copy nginx config and stub wrapper html file from server into repo, with deploy/setup instructions
- refactor tag view so that nm-nut includes nm-tag
- refactor modal
    - mainly need one function, with alert/confirm/prompt/etc just setting a couple defaults
    - "thirdButton" really should be an array of buttons and CBs or something...?
- UI: should entire tag show prog/share tooltip? what if it's prog AND share...
- migrate off of firebase simple login
- refactor file structure (e.g. break out js.js, put in controllers/, directives/ folders etc) (and put "use strict" inside of scope in each)
    - http://vesparny.github.io/ng-kickstart
    - http://joshdmiller.github.io/ng-boilerplate/
    - https://github.com/angular/angular-seed
    - https://github.com/angular-app/angular-app
    - http://briantford.com/blog/huuuuuge-angular-apps.html
    - http://briantford.com/blog/angular-yeoman.html
- minify HTML without breaking usemin or tooltips with line breaks (like in shortcuts modal)
- click and drag to outside of modal closes modal (sucks on prog tag screen...)
- on cancel modal, if dynamic prog tag editor and text has changed, confirm
- debounce textarea editing?
- new shortcut potential conflicts
  - message: "HI: new keyboard shortcuts have been added. If you've changed shortcuts away from the defaults, you should check out the shortcuts menu to make sure there are no conflicts."
  - shortcutsChanged and user-stored shortcutChangeIDSeen or something. add it into new features modal
- do something about font sizes (proportional to screen yes, try out on a) 1920x1080, b) smaller screen, c) tablet, d) phone)
- investigate and fix lunr weirdness
- shortcuts
    - MOAR POWER mode: enable overkill, enable checkbox that removes modkey for that shortcut
    - new tag in general (ctrl shift t?)
    - maybe shift+enter or comma to add another tag after writing this one (customizeable). it basically just hits enter and opens another/creates a new tag and clears current and leaves focus there
- browser compatibility warning (we only support IE10 and up)
- what to do with multiple tags with the same name? we can disallow it for local tags, but might happen with shared tags. should be given the option to merge or rename - either way we need to store some map on recipient's end
- bug/todo: when deleting tag, remove it from search query if it's in there

### todo eventually

##### notable features

- encryption
    - ALL notes <-- important, required option. like spideroak
    - only private notes <-- necessary?
    - only reasons to *not* encrypt all notes: marginally slower (user won't notice or care), lose everything if you lose password (user would care)
- export (in the future all of these should optionally apply to current selection)
    - Word Document (how to phrase?)
        - "This feature isn't fully implemented yet. Click here to download your notes as an HTML file, which any word processor will be able to open."
    - Share as web page
        - (<hr> between notes, starting with <h3>Tags: tag1, tag2</h3>)
    - JSON
    - later
        - xls
    - info
        - http://updates.html5rocks.com/2011/08/Saving-generated-files-on-the-client-side
        - http://www.html5rocks.com/en/tutorials/file/filesystem/
        - http://stackoverflow.com/questions/3665115/create-a-file-in-memory-for-user-to-download-not-through-server/3665147#3665147
        - http://eligrey.com/blog/post/saving-generated-files-on-the-client-side
        - https://developer.mozilla.org/en-US/docs/Web/API/URL.createObjectURL?redirectlocale=en-US&redirectslug=URL.createObjectURL
- login via fb/google/github/whatevs
    - are user id numbers unique or do i need e.g. 'simplelogin:46'? if not... migrate away from provider in user id for /users and /emailToId

##### minor features

- manifest that lets you install web app as android application? and then post to http://mobilewebappsftw.tumblr.com/
- check $s.u.user.isTemporaryPassword and if so direct them to change password page - it means they used works-for-24h-only token
- remove all instances of `alert()` and replace with dynamic modal. on chrome and FF at least, alert windows begin with "The page at https://megnut.s3.amazonaws.com says:"
- implement sort by query match strength
- deploy should have rollback functionality: download the current assets (just html right?) and save them somewhere to put back. maybe grunt plugin already exists

##### bits and bugs

- re-investigate orderObjectBy, benchmark to see if it makes sense or is an issue
    - now building $s.n.nutsDisplay (which is an array) so only used for tags, so less of an issue
- hide nmScope in /* DEV ONLY */ block or something
- move feedback from zapier to watcher.js
- load html and angular REAL fast and then async all the other shit
- dynamic modals should have:
    - space/functionality for a reponse, like "user not found" or "incorrect password", or checkmark, while modal stays open, instead of closing and re-opening

### todo not thought through

- tutorial/wizard/helper/cheat mode. maybe some bar along the bottom that displays some info for everything you hover on and every state you're in. would adapt to your shortcuts. so while you are in a nut it would have ctrl+t for tag writing. while you're tag adding it would have enter to add tag, comma to add tag and add another, etc.
    - some mild animation, a pulse or something, when helper text changes
    - would we ever need more? like arrows pointing at the add tag button? options:
        - not needed
        - helper mode also shows overlays
        - some text ("the plus icon") is dashed-underlined and when you hover, it shows the arrow overlay
- for "no simultaneous editing" warning, maybe option to enter readonly mode?
    - Glowing red connection cloud, on hover: "Currently in read-only mode because you have logged in to Nutmeg from somewhere else. Please refresh to load those changes and continue editing."
    - would be better to just allow simultaneous editing
- for custom modal warnings, would be nice to have cracked-open nutmeg graphic
- investigate if property name length matters in firebase - if so, have some automated minifier two-way dictionary to convert prop names - nice github plugin maybe
- tag autocomplete also sorts by most used?
    - how to mix match score with most used?
        - order by match score but highlight the most used
        - 50/50 or something like that
    - many definitions of most used:
        - on the most notes
        - searched/filtered for the most (frequency or time?)
        - notes with this tag focused on the most
    - most used EVER or in past year/month/day?
- add config to control how tags are sorted on an individual nut? alphabetical, most/fewest docs, recently/oldest modified/created
    - highlighting the tags with the fewest docs is cool. generic ones like "quote" or "list" may be less salient. could maybe change opacity or size accordingly
- ctrl+z. how best to implement? ask on quora or stack overflow? stack of actions, each with a `do` and `undo` action you can execute (`do` needed so you can redo). e.g. if you do deleteTag(4), you'd push an object onto the stack with `do` = `deleteTag(4)` and `undo` = `createTag({whatever})` having saved the state of the tag and all the docs it was on
- consider browser spell-checking - option to disable? if we switch to div content editable, will we lose it?

### todo backlog

- dbg time for lunr search
- merge shortcut and settings/layout functionality. they're shortcuts are just special versions of settings. also, use the id system of shortcuts for storing configs in firebase? eh clean up
- put lunr.update() in updateNutInIndex() (even on init?) into web workers so they don't halt the page
- while add tag to note input has focus, don't shrink scroll height?
- deal with nuts and tags being sparse arrays full of undefineds for each thing you've deleted. `track by $index` fixes duplicates in ng-repeat, but entries still show up in the DOM but are just hidden with ng-hide="!nut". kind of ugly.
    - might help https://github.com/angular/angular.js/issues/1286
- bugs in IE10
    - modal overlay isn't working (menu and sync status show, you can still focus on stuff)
    - some tooltips work, some don't
- time tag autocompletion and then possibly cache the results of `fuzzyInitialismMatch()` - moving `highlightStringIndices()` into that function and into the cache
    - http://www.dustindiaz.com/autocomplete-fuzzy-matching
    - http://www.dustindiaz.com/javascript-cache-provider/

## QUESTIONS

- feedback placeholder text "Bug reports and suggestions are eagerly awaited. You'll hear from me personally." Maybe just "Bug reports and suggestions are eagerly awaited!"
- nutmeg should remember your current location. details:
    - is your location just your query, or the query and where you've scrolled to?
    - should your location be remembered across all machines, or should each machine locally remember its location? configurable?
- SHARING: should it be on a per-note basis, per-tag basis, or both? both might get messy
- Do I want to obfuscate/uglify JS (and CSS?) https://github.com/mishoo/UglifyJS2 and/or https://npmjs.org/package/node-minify

#### private notes/tags

you need to be able to specify any tag as "private" (maybe have a default tag called "private" that already has this set). need to be able to do for any tags because, when unlocked, private tags shouldn't even show

how to implement? need to actually set value on nut as well. maybe have n.checkPrivate(id) which loops through tags and makes sure it has the right value. this would need to get called whenever tags are added or removed from note

also visually show on note? maybe icon you can click which is basically a shortcut for adding (creating if there is none) the "private" tag?

specify time after last inactivity to log out of private mode

where should the option to enter/leave private mode be? key icon next to new note icon or sort menu? in menu? shortcut clearly. need some visualization (big green key) of when it's on

iiiiiiiiiiii

https://nutmeg.io has app. All stuff served over https AWS.

- option 1: https://nutmeg.io also has about/info page in the same index.html. In order to keep SEO juice with nutmeg.io domain, all images will have to be served over https directly from EC2.
- option 2:
    - a: Separate page http://nutmeg.io/about (or /info or /whatever) which can have dynamic content from EC2, and has insecure static content delivered from S3 via http://static.nutmeg.io
    - b: http://about.nutmeg.io is an entire static site served over s3

What's important is that for a first-time visitor to nutmeg.io it's incredibly easy to both log in and see info

Also, presumably want to redirect http://nutmeg.io to https://nutmeg.io. Is an exception possible for option 2a? Probably.

## collaboration

http://stackoverflow.com/questions/17798444/how-to-structure-firebase-data-and-rules-for-sharing-data-between-users

`uid-nutid` is a global identifier for a note - easy to reach in firebase too.

Shared notes have an owner but then some collection like `collab/uid/` is a list of uid-nutids with that uid has access too (to keep permissions might have to do something hackier)

The sample notes should be ones shared from my own store.

Deleting a shared note just removes it from your store. (any way to get it back? eh low priority, can always be re-invited by owner)

How to handle tags? Maybe show others' tags for it faded, but you can click on them to add them to your own tags for the thing.

### cloud storage

manual procedure if i want everything in `localStorage` and sync that to the cloud

- client has everything on their side, loadData() downloads it all at start
- syncTag/Nut takes data, packs into single request and sends to to nutmeg server (later this should just package the changes)
- client does ALL the work. keeps track of tag/nutIds changed, and every X minutes or on startup or quitting do sync. when synced, changelist gets cleared and we receive version # from server (see next)
- server also keeps track of sync. when client syncs with server, server sends some incremented version #. if on startup, server's version # is different, client needs new stuff. just download whole thing.
- little sync icon: green when in sync, yellow when out of sync, spinning when syncing, red when offline. hover should tell you this.
- loadData() does all this
    - show "loading data" overlay
    - if not connected to internet
        - show warning, set sync icon/status
    - if connected to internet
        - get version # from server
            - if different
                - if local changelist is empty, download entire new data from server and get new version #
                    - overlay message "Your notes have changed since you were last online, fetching updates..." with silvery vector image of tree
                - if local changelist is NOT empty, display warning in overlay "While you were offline, changes were made to your notes from another computer. Unfortunately, you also have unsynced changes on this computer. We warned you that offline mode was experimental. Who knows what will happen!" or provide one of two options below
                - re-index lunr, cause we downloaded new stuff
            - if not different
                - if local changelist is empty, we're done
                - if local changlist not empty, we're done, but set sync icon/status accordingly

##### two logged in machines at the same time

Have to continually check version # - every time you sync. If you ever have changelist + different version #, display message? freeze action on that machine until message is answered. Maybe use socket.io to push changes to all connected machines at once. Maybe display icon next to sync icon that when you hover tells you about this.

##### conflict resolution

machine A makes changes offline, while machine B (online, or offline and syncing before A) makes changes. may get conflicting/overlapping sync requests. think about it

basically, question is, if we try to sync and server has new version # and we have changelist, do we pull changes first or push them? ask user which changes should take precedence. warning message as above, then: a) "Ignore changes made on this computer, just give me what's in the cloud." pull only, then clear changelist. since we pull EVERYTHING right now, this will obliterate local changes. b) "Merge my changes into what's on the cloud" push first then pull. probably better. could still overwrite some stuff.

"Warning: Offline mode is still experimental. You're fine if you just use this computer. If you want to make changes on another computer, however, *make sure to connect to the internet for a sync on this machine first*. If you don't, unpredictable things will happen and changes you make may overwrite each other or not be saved." 'Okay, remind me next time too' or 'Okay, got it'

***

## design

- The nutmeg tree could embody the server-side aspects of nutmeg - signing up, backups, syncing, etc. A silvery vector image of a sheltering tree could be used.
- Hover effect for nut textareas in addition to focus? Maybe a border/outline/highlight?
- some kind of tag relationship visualization: http://bl.ocks.org/mbostock/7607535

### tags design

So... per-tag color and bg color. How to do hover?

- Controllabe is too much effort
- inverting is easy but might feel too rainbow
- Maybe darkening/lightening/depending
- Or not change colors
    - beveling pop-forward effect
    - border that's the same color as the text.

nut icons? useful for like the `private` nut (or any nut you select as private, cause you can do that?). tags could have compound icons. or the tag clarifiers could be represented as icons.

## querying

- tag suggestions
    - when you hit two chars, or even one? autocomplete least, bolding letters you've written.
    - sort by (configurable?)
        - most used
        - most recently used
        - ?
    - first is highlighted. tab/arrow keys moves between highlighting
    - enter selects.
    - shortcuts configurable 
- index search starts at 3 chars?
- spaces: by default everything is AND (lunr does this). configurable to OR? searches both tags and notes
- "exact text" - deal with stemming - want no stemming?
- shift-enter moves to first search results (from which you can tab/shift tab (uu) between)
- parenthese? invert entire query, invert individual parts of query?
- how to deal with accented characters? ideally searching for plain roman leter should get you all accented versions of that letter (though searching for an accented version should restrict to that version)
- by default not case senstive
- enter (when not potentially autocompleting) focuses the first result

### special queries

these are autosuggested and packaged up like tags are (but different color/look)

- length
    - length:>50 // longer than 50 words
    - length:50+ // alias
    - l:50+ // alias
    - l:50w+ // alias (default is words)
    - l:50w // TODO should exactly 50 words is silly. default to + or -? tooltip telling you to pick one? 
    - l:>50c+ // characters
    - l:50-500 // range
- timestamps
    - modified:<50 // less than 50 days ago
    - created:<50 // less than 50 days ago
    - created:<50d // alias
    - created:50- // alias
    - c:50- // alias
    - c:50h+ // 50 hours or older
    - c:1-2y // betweeen 1 and 2 years ago
    - m:1h- // last modified within last hour
    - m:2y+ // last modified over two years ago
    - m:2010-212 // last modified 2010 through 2012
- collaborators
    - with:ece // will do a search of users for 'ece'
    - w:ece
- number of tags
    - t:0
    - t:5+

aliases autocomplete to full text?

user-defined alias? regex? length: (d*)([cw]*)([+-]+): $1 is length, $2 is c or w or nothing, $3 is direction

or (d*)-(d*)([cw]*)([+-]+) for range

## nut list

- choose maximum # of lines in nut
- zoom to first example of search result (maybe nearest paragraph or a few lines above)
- configurable:
    - nut size stays same unless you change it manually, OR
    - when you focus on nut it auto expands to full size (and contracts again when you blur)
- formatting: bold, italic, underline, bulleted list, numbered list, links
- on any note OR entire query, you can:
    - delete
    - change creation date
    - share/send to/export
    - bulk add/remove tags (deal like gmail with labels that some but not all in selection have)
- on individual notes
    - see timestamps
    - create new note with the same tags
- customizeable views but two default: browser and note
    - browser: full screen, tag list, shows multiple results (tiny tiny section navigation icon), search bar, menu
    - note: windowed, (transparent bg?), larger section navigation chiclet,

## tags

- pseudo tag "untagged"
- two options for what tags shown:
    - default: all tags
    - tags just in query (with numbers reflecting)
- hover gives you options to rename, delete, and change colors.
- does clicking add this tag to current nut, or add tag to query? both available in hover menu and configurable "default on click action" for tags?
- duplicate tags names not allowed, but tag names are case sensitive
- sticky tags (float to top of any query, otherwise sorted as normal amongst themselves) - balloon or thumbtack icon?
    - how to implement:
        - per-note setting - little button/icon on each note
        - actually a tag, but represented and toggled as a little icon on the note
        - either of the above, plus ability to specify any tag as sticky
    - leaden tags too? float to bottom. brick icon. sometimes i'm making a note just to store some data... and then want to get it out of my sight

tag types

- totally manual tags
- private, sticky, archived
    - icons in corner of notes that are on or off
    - but when they're on they actually add tags (visually different: just icons) to the note
    - PLUS you can specify certain tags as always sticky/private/etc.
      - add icon to that tag
      - icon in corner of note should be on. if you click it (to turn it off) it should highlight the tags that have that property
- robot tags
- search query tags?
  - give example queries, could be keyword search, tag combinations, other queries like date/length/etc

can you manually add nuts to a automatic tag?

### adding tags to notes

- to add the highlighted suggestion (the top one is automatically highlighted) press enter or tab or click on it
- to create a new tag while an existing tag is highlighted, hit up and then enter, or press the + button again, or select the "create new tag..." option
- shift+enter adds the tag and then opens up a new add tag field

### tag relationships

http://wordnetweb.princeton.edu/perl/webwn?o2=&o0=1&o8=1&o1=1&o7=&o5=&o9=&o6=&o3=&o4=&r=1&s=country&i=5&h=10100100000#c

http://www.visuwords.com/

- X is parent of Y
- X is related to Y. superset of:
    - X and Y are of the same kind
    - X is the hypernym of Y (Y is a more specific example, a type of X). "color" is hypernym of "red"
    - Y is the hyponym of X.
    - meronymy? "finger" is a meronym of "hand", "istanbul" of "Turkey"
- related-to OR same-kind should be automatic for siblings

Parent tags create sort of implicit tags. Any related tags really. Some way to show tags by their distance from a note. Lower is closer. Immediate tags have distance 1. (Maybe peripheral tags could be used here, see lab). Maybe all tags 1 relationship away would have distance 2. Though maybe different relationships have different distances. Like children of a tag on a nut maybe distance infinity, parents distance +1. Sibling might also be different +1 or maybe +2 or more. Obviously [NRW (not right word) inductive recursive] BLUBBER

Auto-suggesting tag relationships: might have to ask you to confirm which WordNet sense you mean by a tag (can decline for individual tag or select multiple or permanently switch off feature (should be built as a plugin))

**Tag stacks**: Maybe have an option to show, on each tag on each note, an optional number of ancestors. They could peak out from under the tags, at an angle, like a stack, maybe where you could see half of the text, enough to read (and hover shows it). That way like the `Ece` tag would have the `people` tag behind it. Maybe could show this in tag browser too.

### tag prepositions OR per-nut tag relationships OR nut-tag connections OR *tag clarifiers*

let's say a note is one that i am writing about martial. two options

option 1: tag it `martial` and `writing to`. not there yet. because i might also tag `oman` because i'm writing to martial about oman, but from these tags you won't know which. so instead, just for this nut, i say that the `martial` and `writing about` tags are related. (could be a generic relationship which would probably disambiguate enough in almost all cases, or could be diff kinds)

option 2: tag it `martial` and additionally *this* nut's relationship to that tag is the `writing to` relationship. these could be on the fly or structured, or other, with autosuggest.

both options offer cool opportunities to visualize the `martial` tag or `writing to` tag/relationship.

SOLUTION: they're the same. process:

- ctrl+t creates new tag
- type `martial` (autosuggested)
- instead of hitting enter, which adds the tag, hit shift+enter, which adds the tag and opens a new window to describe this nuts relationship to that tag
- type `writing to` (also autosuggested). it adds `writing to` as a tag but visually differentiated and connected to `martial` in this nut's tag list.

the per-tag nut-to-nut relationship really is the same as the this-nut-to-tag relationship. can encode the latter as a tag

tag clarifiers sort of form subtags on the fly. like reusable subtags. rather than have a `martial` tag with `writing to martial` subtag and `celia` tag with `writing to celia` subtag, you just create them on the fly by attaching the `writing to` clarifier to the tag on notes you wish to tag with this subtag

## config

- searching for "importer" brings up a nut that itself contains the import tool (which, like all nuts, can be expanded to full screen mode). when you click on importer from the nutmeg menu, it simply inserts "importer" in to the query box. the menu teaches you the shortcuts - everything can be done through the query box/runner
- adding/removing tags changes "modified" timestamp on nut. what should default be?
- show delete X for each tag in nut
- default nut and tag sort preferences
- option to have sticky/fixed search bar header

## shortcuts

### commands

shortcut can be arbitrary list of commands

- create nut with whatever pre-set stuff - text, tags, etc.

## laboratory

#### auto detecting on-the-fly syntax (nutmeg shortcodes)

let's say i start regularly typing [BLAH something about accessible healthcare]. it can pick this up at offer to create metadata about it OR visualize it as a language construct. this isn't a great example because this is a language construct, not tag metadata (though the former can generate the latter). It is actually metadata, just very specific. You could create queues based on the [BLAH ____] tag. A nut would basically have nut-wide metadata "this has BLAH todos in it".

  nested! [BLAH something about [BLAH something that indicates my usage of BLAH]]] (actually was hard for me to come up with an example)

it could have a browser that suggests syntaxes you've begun to use. even somehow clustering them to suggest a single syntax that might cover multiple things you've been doing. this way you could kind of barely care about being consistent, but it would get picked up (and then find-and-replace). even further in the future it could parse plain text and suggest formalized relationship as language constructs. (parsing plain text for nut-wide metadata, like emotions, is totally already on the cards, and probably easier to make useful)

Of course these shortcodes - all picked up syntax really - could have arbitrarily complex syntax. If I personally stick to shortcode-ish bracket syntax (and obv a repository to share these), simplest would be `[BLAH thing i generally want to communicate]` which is really `[KEYWORD data]`. Could be also not-the-write-word syntax like `[NRW inductive recursive]` which could be `[KEYWORD space separated list]`. Could be overloaded shortcodes, like `[KEYWORD comma separated, if you want phrases]`. Then of course full-blow shorcuts, maybe with command line arg style key/value declarations.

#### transforming tags, state-ful tags

Certain tags (or tag clarifiers) could have sort of multiple forms, like `finish and send to` and `sent to`. And for these maybe you click on it to transform it to the other. Could have any chain of click-to-advance tags. Potentially more complicated, like you click and you get a list of the possible states you can go to next. this is JIRA-ish.

#### tag strength

Two (or arbitrary #) of strengths with which you can attach a tag to a nut. Personally I'd use two: strong (default) and weak/peripheral. Maybe like ctrl+enter would add the tag peripherally, and the tag would be a little bit translucent.

Really the way to make it extensible is a list of levels each with value, shortcut, and opacity level. With a default. Shortcuts could be multi-key, like 1-then-enter.

## Tips/UI

- Shift+click on a tag to select more than one tag to search for. (Details: if a tag is in the query, clicking on it removes it. Otherwise, clicking on it replaces any tags in the query with the tag you clicked on, unless you hold shift, in which case it adds it)
- When adding a tag to a nut, hold shift to immediately open the input field again for adding another tag
- When deleting a note (either with the keyboard shortcut or clicking on the trash icon) hold shift to delete without confirming

## RANDO

- maximum BSON size is 16mb. large documents with history may reach this. deal with/alert about/trim history/whatever
- have a hello message to users who open the JS console on nutmeg
- instead of framing $ for improvements as bounties, could be like conditional donations: i'll donate X if this feature/whatever gets built
- filtering with ng-repeat and ng-show may be slow for large number of nuts

## Ridiculous Features

The ability to share a note with someone but without them being able to see the text of the note - they can only see the tags and the timestamps. So it will, for instance, show at the top when sorting by recently modified if they've edited it. Useful for love letters and kinky plans.

# Data Model

data to store:

- user info, status, and preferences
- notes (each with history, tags, metadata)
- tags (each with notes, tag relationships)

one collection/user vs 50 collections vs 1 collection for everyone, 50 probably best: http://www.colinhowe.co.uk/2012/jul/09/mongodb-collection-per-user-performance/

could have user collection which stored name of note collection. multiple users in same note collection.

# Dev Tools and Snippets

testing firebase in console:

    function fbGet(childRef) {
      new Firebase('https://nutmeg.firebaseio.com/' + childRef).once('value', function foo(data) {console.log(data.val())}, function(err) {console.warn(err)});
    }
    function fbSet(childRef, val) {
      new Firebase('https://nutmeg.firebaseio.com/' + childRef).set(val, function foo(err) {console.log('done', err)});
    }
    fbGet('users/simplelogin:1/nuts/0')

# Resources

- disable text-selection: http://stackoverflow.com/questions/826782/css-rule-to-disable-text-selection-highlighting
- guides (for wizards/tutorials)
    - http://linkedin.github.io/hopscotch/
    - https://github.com/jeff-optimizely/Guiders-JS
- cool markdown: https://stackedit.io/
- vim bindings in text areas and other stuff! http://codemirror.net/ OR http://ace.c9.io/
- for collaboration? http://www.firepad.io/
- https://build.phonegap.com/
- REST API for email? http://context.io/
- http://www.impressivewebs.com/textarea-auto-resize/
- git hooks
    - http://stackoverflow.com/questions/9132144/how-can-i-automatically-deploy-my-app-after-a-git-push-github-and-node-js/9150437#9150437
    - https://bitbucket.org/tobyfox/nutmeg/admin/hooks
- checking whether online, client-side:
    - http://www.html5rocks.com/en/mobile/workingoffthegrid/
    - https://developer.mozilla.org/en-US/docs/Web/API/NavigatorOnLine.onLine?redirectlocale=en-US&redirectslug=Web%2FAPI%2FNavigator.onLine
- http://craig.is/killing/mice
- http://bitdrift.com/post/2376383378/using-mustache-templates-in-express
- searching/indexing
    - http://stackoverflow.com/questions/16625104/is-there-a-good-indexing-search-engine-for-node-js
    - https://github.com/lbdremy/solr-node-client
    - http://lbdremy.github.io/solr-node-client/
    - https://github.com/fergiemcdowall/forage
    - https://github.com/fergiemcdowall/search-index
    - http://lucene.apache.org/
- angular
    - simple example of storing model in a service to access it from multiple controllers: http://stackoverflow.com/questions/11112608/angularjs-where-to-put-model-data-and-behaviour
    - storing logged-in user context: http://stackoverflow.com/questions/14206492/how-do-i-store-a-current-user-context-in-angular
    - wrapping tinymce in angular: http://jsfiddle.net/programmieraffe/kjsEV/
- http://prediction.io/

if you hit performance issues with lunr, could offload to a web-worker. can migrate to solr or something later.

every time you open up or switch to it (shouldn't be distracting actually...) like a popup in the corner with an autosuggestion you can approve or remove. could use automated summarization. "should this note about 'blah blah blah' have the 'blah' tag?""

## inspiration

- http://www.xmind.net/
- intellisense? looks like intellisense is just code completion of properties and methods, and not open source. was justin referring to something else?

# describing

- An API for your writing/text
- Evernote and Vim had a baby, and she was beautiful. Trello's the godmother.
- Git for creative writing
- Computational linguistics for the masses
