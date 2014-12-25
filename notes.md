l = lunr(function () {
  this.field('body', {boost: 1});
  this.ref('id');
})
l.update({"body":"yo some words", "id": 0})
l.search("word") // returns one result
l.search("some") // returns no results


## TODO

### todo for beta: bits and bugs

- mention in firstInit() notes something about if you're interested then... or if you want to help out
- FAQ
- forgot password link that resets
    - reset password should be grammatical passphrase:  The <adjective> <noun> is <verb> <adverb>. The green cat is jumping wildly. have lists for the categories. with 1024 choices for each you have 40 bits of entropy.
- listen to remote changes in Firebase (suggesting you've logged in elsewhere) and if detected, show popup saying that you've logged in and changed elsewhere, you gotta refresh or something
- issues connecting to firebase
    - somehow listen for connection/disconnection and alert user and change cloud to red
    - maybe set some time in `push()`, and if `pushHackCounter>0` in `push()`, and if some length of time has passed (like 30s) then alert user and suggest something
    - https://www.firebase.com/docs/managing-presence.html
- new user welcome message
    - have to store email in user object when account is created
    - have to set up reverse DNS and other bulkmail stuff, or free account somewhere
- more robust circular modal
- better nutmeg logo
- favicon
- font
- make it not run slowly (like when autosizing)
- better login error messages
- invite only?

### todo for beta: 

- private notes
- rudimentary programmatic tagging (popup modal with code editor and prototype of function and examples)
- intro page with a tiny bit of info and demo
    - demo: set some variable which basically disables digest (replaces it with dummy?). make sure to have an alert saying "WARNING: none of the changes you make here will be saved"
        - ideally, when you create an account, it is saved?
- mobile responsive
- shared notes
    - live collab
- "star"

### todo next

- highlight and scroll to matched query in search results
- new shortcut potential conflicts
  - message: "HI: new keyboard shortcuts have been added. If you've changed shortcuts away from the defaults, you should check out the shortcuts menu to make sure there are no conflicts."
  - shortcutsChanged and user-stored shortcutChangeIDSeen or something. add it into new features modal
- refactor entire app, with tests, split up into multiple files, with build and minification, etc
    - http://vesparny.github.io/ng-kickstart
    - http://joshdmiller.github.io/ng-boilerplate/
    - https://github.com/angular/angular-seed
    - https://github.com/angular-app/angular-app
    - http://briantford.com/blog/huuuuuge-angular-apps.html
    - http://briantford.com/blog/angular-yeoman.html
- do something about font sizes (proportional to screen yes, try out on a) 1920x1080, b) smaller screen, c) tablet, d) phone)
- roll back functionality in deploy.js. first GET, then create archive with date/time of deployment
- create account by invite only + 'request invite' button
    - basically give a unique URL like nutmeg.io?invite=somethingcute
    - with login, if invite query param exists and matches again firebase array i've hand-added, then show create account (nicer welcome message) and then update firebase with this invite being taken
- investigate and fix lunr weirdness
- shortcuts
    - MOAR POWER mode: enable overkill, enable checkbox that removes modkey for that shortcut
    - new tag in general (ctrl shift t?)
    - maybe shift+enter or comma to add another tag after writing this one (customizeable). it basically just hits enter and opens another/creates a new tag and clears current and leaves focus there
- browser compatibility warning

### todo eventually

- email me when new users (and answer http://stackoverflow.com/questions/17723195/is-there-any-way-to-do-email-confirmation-for-firebase-user-creation-and-or-pass)
- remove all instances of `alert()` and replace with some single modal function. on chrome and FF at least, alert windows begin with "The page at https://megnut.s3.amazonaws.com says:"
- implement sort by query match strength
- investigate if property name length matters in firebase - if so, have some automated minifier two-way dictionary to convert prop names - nice github plugin maybe
- dbg time for lunr search
- tag autocomplete also sorts by most used?
    - how to mix match score with most used?
        - order by match score but highlight the most used
        - 50/50 or something like that
    - many definitions of most used:
        - on the most notes
        - searched/filtered for the most (frequency or time?)
        - notes with this tag focused on the most
    - most used EVER or in past year/month/day?
- hover over clock show creation and mod times, also mention history? pencil icon to edit creation date?
- how/where to show modified/created dates on nuts? only on hover or focus?
    - could choose which (if any) of these to display
    - could be like tags, all the way to the right, with icon (clock for modified, star explosion for created?) instead of delete tag button
    - hover or right click menu would let you not show/show times
- right now i always display everything in #nuts. this could get unwieldy. this will have to be fixed in various places
- add config to control how tags are sorted on an individual nut? alphabetical, most/fewest docs, recently/oldest modified/created
    - highlighting the tags with the fewest docs is cool. generic ones like "quote" or "list" may be less salient. could maybe change opacity or size accordingly
- ctrl+z. how best to implement? ask on quora or stack overflow? stack of actions, each with a `do` and `undo` action you can execute (`do` needed so you can redo). e.g. if you do deleteTag(4), you'd push an object onto the stack with `do` = `deleteTag(4)` and `undo` = `createTag({whatever})` having saved the state of the tag and all the docs it was on
- consider browser spell-checking - option to disable? if we switch to div content editable, will we lose it?
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
- tutorial/wizard/helper/cheat mode. maybe some bar along the bottom that displays some info for everything you hover on and every state you're in. would adapt to your shortcuts. so while you are in a nut it would have ctrl+t for tag writing. while you're tag adding it would have enter to add tag, comma to add tag and add another, etc.
    - some mild animation, a pulse or something, when helper text changes
    - would we ever need more? like arrows pointing at the add tag button? options:
        - not needed
        - helper mode also shows overlays
        - some text ("the plus icon") is dashed-underlined and when you hover, it shows the arrow overlay

### todo backlog

- merge shortcut and settings/layout functionality. they're shortcuts are just special versions of settings. also, use the id system of shortcuts for storing configs in firebase? eh clean up
- put lunr.update() in updateNutInIndex() (even on init?) into web workers so they don't halt the page
- while add tag to note input has focus, don't shrink scroll height?
- deal with nuts and tags being sparse arrays full of undefineds for each thing you've deleted. `track by $index` fixes duplicates in ng-repeat, but entries still show up in the DOM but are just hidden with ng-hide="!nut". kind of ugly.
    - might help https://github.com/angular/angular.js/issues/1286
- esc exits modal
- gzip before uploading the S3 and set headers appopriately: http://www.jamiebegin.com/serving-compressed-gzipped-static-files-from-amazon-s3-or-cloudfront/ (just make sure no .gz extension)
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

## info site

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
