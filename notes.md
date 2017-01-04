# TODO

- check tooltips are good on mobile
- clicking on "archive" on an expanded note doesn't work. i think it starts unexpanding on mousedown and archive click doesn't register yet. it worked on touchdown.
- layouts
    - get rid of write mode
    - scroll mode AND browse mode have option to bring in tag browser
- all buttons should be same height, secondary should have white bg, private mode enabling should be primary, revert settings should be primary, get rid of all plain `.btn`s
- shortcuts align mod key with other ones
- tag data like sentiment value - show in dropdown
- make all bg images and profile images https


AMAZING. run `node --debug-brk --inspect=9222 /usr/lib/node_modules/webpack-dev-server/bin/webpack-dev-server.js --config config/webpack.dev.js --progress --profile --watch --content-base src/` then open up the URL in browser, it'll be stopped on first line and then you can continue!

- "view X notes" in note tag dropdown should change if it's in the search bar already
- @TODO/ece Archiving question. So pinning: always shows at the top if it should show up in a search query. Archiving: ditto, always at the bottom. So basically it just affects sort. But there's another interpretation of archiving, prob more common, like in gmail: archived stuff doesn't appear unless you search for it, and when you do search for it, it appears in the normal order. Should we do that? We can still indicate archived notes stylistically. If we do it, we should have a button at the end of all your notes (if you're not searching) saying "show X archived notes" otherwise someone might be like where's my stuff.
- explore
    - explore dropdown on open note should go up
    - click anywhere to remove
    - explore button should be active
    - modal?
- when you click on add tag, tooltip remains!
- "remove" tooltip shouldn't appear on tag in note query? or should be different
- sort dropdown might not be updating to show initial, non "recently modified" state?
- when you pin/archive something, the (new?) tooltip gets detached and sits in the top left corner?!

nov 28 - dec 4

- tooltip notifications + information indicators
- smart tag improvements
- smart tag examples

dec 5 - dec 11

- smart tag examples
- smart tag parameters and/or IFTTT

dec 12 - dec 18

- design tweaks + fixes
- mobile responsive

dec 19 - dec 25

- design tweaks + fixes
- analytics
- onboarding/finish homepage/pricing
- bugs

dec 26 - jan 1

- design tweaks + fixes
- pricing
- bugs
- woo

### right now

- change email and get password prompt, close then open again quick: it's broke. see if changinng mockfirebase to have 0 second timeout fixes? doubt it

### now

- design tweaks
    - large writing indicator? and "x" out should be towards the left?
- tag issues
    - autcomplete, then press `up`, then hit enter. doesn't add!
    - shorter tag should score better! (for ece, "medieval game" is suggested for "game", even though she has a "game" tag)
- new account data: at least one note should have multiple tags so that a connection can be seen in tag explore d3 graph
- bugs
    - "ok" button in "logged in elsewhere" modal doesn't work?
    - when timezone set to thailand (ICT) this (`new Intl.DateTimeFormat('en-US', new Date(1420250076112))`) breaks with `Unsupported time zone specified undefined`
    - pressing new note shortcut
    - modal alert focus should go on button so user can hit enter/space (or left/right/tab to choose) and close out. right now focus stays put so you might keep entering some form or something instead

### homepage + demo

- better tag explore stuff + autoscroll?
- update demo script
- delay start of typing until initialization
- email sign up should send email (low priority if we never really have private beta up)
- click to go through screens? dots etc.
- napoleon should be a more normal name?
- make "show all tags" appear (`has--tag-overflow` on `<note>`)
- make "learn more" bob and link to scroll down
- start loading bg image when page loads
- make sendgrid form invisible until initialized

### firebase migrate

- links
    - <https://firebase.google.com/docs/reference/js/firebase.auth.Auth#createUserWithEmailAndPassword>
    - <https://firebase.google.com/docs/reference/js/firebase.User#sendEmailVerification>
- what does provider/providerId get you?
- delete account
- test feedback
- test create/login/logout a bunch
- hash/salt password (1-way hash, salt with user agent)

### more tag visualization d3 animation stuff

- on tag detail page it says "x notes" and right underneath, the viz. looks like nodes could be notes. should maybe have "x notes" and then first used/most recently used, maybe some info about the notes, and then "x cooccurringBLAH tag" then viz
- that bug
    - commented out: hover on tag list hovers the diagram
- keep homepage demo fixed as central tag
    - maybe make it looser?
- full screen!
- later
    - ability to hide programmatic tags (and/or make programmatic tag links weak?)
    - when navigating to new tag via click, centralTag could be positioned where mouseclick was
    - `centralTag` should maybe have stronger/weaker longer/shorter links
    - hover menu to see more details (# notes, go to tag) and ability to remove from graph
        - remove could just break links? see B on <http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/>
    - collapsible example in v4: <https://jsfiddle.net/t4vzg650/6/>
    - drag to pin?
    - dynamic label positioning? <http://bl.ocks.org/MoritzStefaner/1377729>
    - more stuff in <http://www.coppelia.io/2014/07/an-a-to-z-of-extra-features-for-the-d3-force-layout/>
    - fixed central nodes dont exert forces? maybe they should be fixed by a new force instead of fixed with `fx` and `fy`
    - for fade on hover, could fade-less notes that are connected by two degrees

### prog tag examples

##### searchable subtags

- toggling tag toggles whole tag not subtag - should there be an additional "view all 'sentiment' notes that shows all?"
- wrong count of notes for subtags in dropdown (and clicking "view all X notes" shows  base tag)
- tags and subtags in the query bar
    - already-present subtags aren't filtered out (e.g. if you have `sentiment: positive`, autocomplete still shows `sentiment` and all its subtags
    - and if you have parent tag then subtags ARE filtered out
    - should you be allowed to have `sentiment` and `sentiment: positive` at the same time? since they're `and`ed, it basically equals `sentiment: positive`. we can a) leave it, or b) have the later one you add replace the one already present
- home component setUpNewNoteTags needs to handle TagOrSubtag (not really cause it's skipping prog tags, but make a note)

### prog tags

- custom
    - after running prog on all notes, re-sort tag browser
    - loading
    - firebase can't save undefined values so if they put undefined in `noteData` it'll break - error message isn't bad (check error handling is good enough to show) but maybs we can check for it
- library
    - clicking on subtag on note should filter by the subtag? OR should both be an option?
    - enabling smart tag makes new note become a real, empty note?
    - make sure update of score when note was already tagged actually triggers update and saves to data store
    - loading!
    - later
        - library updating of function re-running it only happens when prog tag lib service is loaded whichonly happens when you go to library page. should a) happen on startup, and b) show notif
            - (a) should be done, double check. not b
        - change detection issue with sync status set to unsynced, try to provoke with enabling/disabling while syncing? while not?
        - need some ability to force an update (in the background). possibly store update timestamp and if it's more recent than user's version's library update time, then re-run on all. (or version # haha)

### pinning/archiving - 2:30

- exclude from appropriate places
    - tag style: grayed out? added pin/archive icon (in browser and query bar), that cool?
    - tag viz: color differently? (archive could get HUGE)
- later
    - hide when ranking by # of tags on a note
    - when showing up in search query autocomplete,should it look different? italicized, has tooltip, pin icon...?
    - barrier and/or hidden (click to see archived) between normal and archived? what about between pinned and normal?
    - other visual effect to indicate state?
    - cool icons
        - `bath` icon, "leave it to soak" vs `shower` (maybe setting that enalbes  that? could choose any haha
        - `bomb`, `leaf`
        - `rocket`, `cake`
        - `fighter-jet`, `paper-plane`,
        - `ship`, `anchor`
        - `fire`, `snowflake`
    - setting(s) to further expose
        - addable from add tag field?
        - show on notes?

### geolocation

##### more

    interface Location extends Tag {
        // for now make this "internal" or experimental - like dev mode only, and show at the end of tag list if shown, otherwise hide from notes and tag browser and graphs and cooccurrences and search and autocomplete

        coords: {
            lat: double,
            long: double,
            radius: double, // in meters - other coordinates that fall within this radius should be considered the s ame location
        }
        googlePlaceId?: string,

        /** Determines whether another location should be considered the same as this one, based on their given coordinates' accuracy and our coords radius. (I guess just work out if straight line distance between two centers is equal or less than radius + accuracy?) */
        isThisLocation: (coords: Coordinates) => boolean,

        // also need some way to quantify the distance/match so we can pick the best match. we can have % of overlapping area, disance from their centers (relative to their radii/accuracy?), other stuff.
    }

    interface InProgressLocationNoteWork {
        note: Note,
        timeStart: number,
        noteBodyStart: string,
        startCoords: Coordinates,
    }

    interface LocationNoteWork {
        location: Location,
        note: Note,
        timeStart: number,
        timeEnd: number,
        work: number,

        // save Coordinates object? that can have `speed`, not sure how often it's implemented but could be cool to be like... stuff you wrote while moving (walking? driving? train?).
        // could have optional `locationEnd` that also references `Location` if that work started and ended at a different place. though most likely you would have focused and unfocused multiple times, so we'd have to make sure the InProgressLocatioNoteWork got maintained properly

        quantifyNoteWork: (startText: string, endText: string) => number,
    }

Base tag "location" with subtags for each location.

That means one note can be tagged with multiple subtags of the same tag, so we need subtag-note-specific data (in this case: list of instances of created/modified/how much changed.)

How to quantify difference between two copies of note body. And can we simply take ratio of `difference` to `sum of all differences of instances working on the note` to see how much of this note is "due" to this location (and also tags).

when you create a location, could have distance radius for conflating other locations with this location - default but possible to change.

how to handle larger locations, like `new york city`?

we should store the most narrow location tag. `grove` can be a subtag of `new york city`, which is a subtag of `usa`, which is a subtag of `location`. i guess one tag should be able to be a subtag of multiple tags, like `grove` can also be a subtag of `homes`.

Notes have an array of `LocationNoteWork` instances so you can draw a timeline.

##### defining work/difference/timing of location <-> note

when you focus on a note, record `InProgressLocationNoteWork`. when you unfocus, add end timestamp and difference/work quantification, identify or create a new `Location`, and save `LocationNoteWork`. How to check coords at end vs coords at beginning? maybe just save beginning of now?

when a new `LocationNoteWork` object is saved, check if `newlocation.timeStart` is close enough to `previousLocation.timeEnd` (also check distance of location?) and if so, merge the two (update `timeEnd` and add to `work`).

When saving, search through existing locations to see if this is one of them, otherwise make a new location.

If body text hasn't changed, don't record any work? This means that adding/removing tag only doesn't add a location. I think that makes sense - let's say you're going through a bunch of stuff categorizing it, or you add a new smart tag... shouldn't add to locations.

##### MVP implementation

- explore note drawer to show raw data
- setting to enable geolocation data
    - when enabled:
        - ask, show loading
        - if approved, save in localstorage AND in settings
        - if denied, toaster saying denied
    - if it's in localstorage, all good
    - if it's settings but NOT local storage, then:
        - simply prompt when you first open nutmeg and hope they hit okay
            - (maybe along with toaster you can click through to see location settings) - "geolocation enabled for your account but not this device, requesting accesss...<br><br>[change settings](#)"
        - WILL BE IGNORED? toaster saying "you've enabled geolocation for your account but have not authorized geolocation access from this browser/device, click here to enable"
        - TOO INTERRUPTIVE AND WORDY? modal prompt with above message, buttons "enable geolocation on this device", "don't save locations from this device", "disable geolocation for my entire account"
- on note focus and first change
    - attach `InProgressLocationNoteWork` to note and set needs full update
        - watch position with desired accuracy and update coords as you go along
    - on blur or any full update, finalize into `LocationNoteWork`, collapsing into previous one if possible, creating new `Location` if necessary
    - questions:
        - should "collapsing" happen when you start editing?
        - how do we handle timeEnd if full udpate happens later?

Display: note will have amongst its list of tags one or more location tags. Can grab these to crunch the data.

##### resources

- google
    - [keys](https://console.developers.google.com/apis/credentials?project=nutmeg-78fba)
    - [map embed](https://developers.google.com/maps/documentation/embed/guide)
        - `<iframe src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBexxZ5F2fg_4-rSrwu2CBZ8uZF8niG1Ug&q=40.7014138,-73.91833489999999"></iframe>`
    - [geocoding](https://developers.google.com/maps/documentation/geocoding/start) (convert coords <-> address)
    - [place search](https://developers.google.com/places/web-service/search) (searching for places near coords)
    - [places library](https://developers.google.com/maps/documentation/javascript/places) spec for places
- <https://github.com/gwilson/getAccurateCurrentPosition>

### revert/trash ability

during a session (or longer in local storage) could save a) deleted notes and tags, and b) older version of a note.

basically when instantiating

### important misc todo

- infinite scroll not working in Scroll mode
- note query tags: style of remove overlay is off

### less important misc todo

- addanothertag behavior is janky. need to confirm it always works as expected but enabled and disabled, and with ctrl/shift enter, and everything
- tag expand - when you click outside it should collapse
- logging out fires a million "note component claims to have tag ID ... but ..." - DID I FIX THIS
- deleting a tag (in this case a note with that tag was open in browser and in query bar) causing `[NoteComponent 12] Note ID 12 claims to have tag ID 16 but no tag found for that ID.`
- the way subtags are handled (autocomplete produces strings like "sentiment: positive" which get put into autocomplete box and then converted from string back into Tag instance...) will break if you have dupe tag names. when adding library tag (with subtags) if you have tag w same name, prevent it or somehow change lib tag name on your end
- if notes sort is not recently modified, show it? i had it on longest and reloaded the page and of course it was still longest and i was like... where's my note
- making a note private when it's the open-note doesn't hide it! should it? also confirm that open note is affected by changing private mode.
- highlight searched-for tags (and change "view X notes" in dropdown to something else)
- test deletion of tag that's used... still seeing that "claims to have tag" bug
- logout breaks angular such that you cant log back in again?
- change search query should scroll you to the top? (if displayed notes change)
- `high` thinks it cooccurrs with `untagged`. make a script to sort out disagreements and missing things
- when logging 

### build/deploy

- cloudfront!

### misc

- make sure when you logout you route back to home page `/` (so that if you log in again you'rein the right place)
- pseudo login: POST not allowed on S3 (and 404ing on local?), and GET exposes creds - make sure ALWAYS over HTTPS
- ensure we're not bundling 2 versions of jquery
    - <https://github.com/AngularClass/angular2-webpack-starter/issues/723>
    - something in wiki too
- scrolling note textareas snagging scroll: only scroll in them if you *start* scrolling in them? doable?
- "revert to defaults" is VERY clickable - make sure it `confirm`s
- confirm `enableProdMode` is being called (check `environment.ts`) in prod deploy
- background image improvements:
    - show default background image before app loads
    - cookie user with their choice of background image it doesn't load two!

### bugs

- touch action on router links reload the page

### talk about with ece

- search `@TODO/ece`

# angular2 notes

when subscribing to search query we can use ng form control `valueChanges`? <http://plnkr.co/edit/m1m0P5Vbb4fIPmrDeOV8?p=info>, can even feed observable straight into template if we put it through `async` pipe

great explanation of how to use `@Input`: <https://egghead.io/lessons/angular-2-passing-data-to-components-with-input>

models: <https://egghead.io/lessons/angular-2-adding-a-data-model>

iterating over objects in angular2: <http://stackoverflow.com/questions/31490713/iterate-over-typescript-dictionary-in-angular-2>

# testing backlog

put `@todo/testing` in appropriate places. also:

- NoteComponent
- NoteListComponent
- TagComponent


STAGING URL: <http://nutmeg-app-staging.s3-website-us-east-1.amazonaws.com/>

# rando ideas

golden ratio, top 4 notes in one segment, next 4 notes, etc. or different panes. once you get down to like 3rd or 4th segment it shows summarization of the notes contained. and you can zoom in like a fractal viewer.

# todo for beta (old)

##### minor features

- some more design bits:
    - tags in search bar should be better
    - timestamps tooltip is clipped (any others?)
    - move note actions into menu?
    - sloping/cut-off/diagonal tags?
        - one of these rotates and hides overflow, that's the only one that works with interesting foreground and background i think:
        - http://tympanus.net/codrops/2011/12/21/slopy-elements-with-css3/
        - http://stackoverflow.com/questions/11074601/diagonal-wedge-shaped-css-edge-to-edge-centered-in-browser
        - http://stackoverflow.com/questions/7324722/cut-corners-using-css
        - http://jsfiddle.net/webtiki/c7h0vrwh/
    - @ui-bg is behind note/tag search fields so they look gray instead of white... could maybe use this clever border method http://jsfiddle.net/VRLNJ/2/
    - UI: should entire tag show prog/share tooltip? what if it's prog AND share...

# QUESTIONS

*****************

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

- chrome extension for debugging angular apps: <http://go.rangle.io/batarangle>
- package website/webapp as chrome app https://developer.chrome.com/apps/about_apps
- auto-update your mac app: http://sparkle-project.org/
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
    - profiling etc: https://github.com/bahmutov/code-snippets
    - simple example of storing model in a service to access it from multiple controllers: http://stackoverflow.com/questions/11112608/angularjs-where-to-put-model-data-and-behaviour
    - storing logged-in user context: http://stackoverflow.com/questions/14206492/how-do-i-store-a-current-user-context-in-angular
    - wrapping tinymce in angular: http://jsfiddle.net/programmieraffe/kjsEV/
- http://prediction.io/

if you hit performance issues with lunr, could offload to a web-worker. can migrate to solr or something later.

every time you open up or switch to it (shouldn't be distracting actually...) like a popup in the corner with an autosuggestion you can approve or remove. could use automated summarization. "should this note about 'blah blah blah' have the 'blah' tag?""

## inspiration

- http://www.xmind.net/
- intellisense? looks like intellisense is just code completion of properties and methods, and not open source. was justin referring to something else?

