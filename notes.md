l = lunr(function () {
  this.field('body', {boost: 1});
  this.ref('id');
})
l.update({"body":"yo some words", "id": 0})
l.search("word") // returns one result
l.search("some") // returns no results

32768

## TODO

- have option (probably default) to only resort when you hit dropdown or refresh. insta-resorting on modified or adding tags is annoying
- autosizeAllNuts() should happen basically whenever the nuts displayed changes. i manually did it on create and delete nut, but even needs to be done whenever sort order changes - whether by using choosing a different sort-by, or by changing stuff (modifying, adding tag) such that a notes position changes
- do something about font sizes (proportional to screen yes, try out on a) 1920x1080, b) smaller screen, c) tablet, d) phone)
- request an invite
  - basically give a unique URL like nutmeg.io?invite=somethingcute
  - with login, if invite query param exists and matches again firebase array i've hand-added, then show create account (nicer welcome message) and then update firebase with this invite being taken
- demo
- right now nutbodyupdatedwhatever only happens on blur. also happen on an interval while has focus, but make sure it only does stuff if it changed (think function does that already)
- nutmeg name on login screen
- investigate if property name length matters in firebase - if so, have some automated minifier two-way dictionary to convert prop names - nice github plugin maybe
- replace 'go' button in login/create account with loading symbol before callback
- esc should leave and blur new tag input
- configurable max-height for nuts but automatically expands otherwise
- highlight matched query in search results
- dbg time for lunr search
- autocomplete tags
- how/where to show modified/created dates on nuts? only on hover or focus?
  - could choose which (if any) of these to display
  - could be like tags, all the way to the right, with icon (clock for modified, star explosion for created?) instead of delete tag button
  - hover or right click menu would let you not show/show times
- how should we communicate a nut being saved? downward (and downward moving) arrow icon in bottom right of textarea?
- right now i always display everything in #nuts. this could get unwieldy. this will have to be fixed in various places
- add config to control how tags are sorted on an individual nut? alphabetical, most/fewest tags, recently/oldest modified/created
- ctrl+z. how best to implement? ask on quora or stack overflow? stack of actions, each with a `do` and `undo` action you can execute (`do` needed so you can redo). e.g. if you do deleteTag(4), you'd push an object onto the stack with `do` = `deleteTag(4)` and `undo` = `createTag({whatever})` having saved the state of the tag and all the docs it was on
- consider browser spell-checking - option to disable? if we switch to div content editable, will we lose it?

### backlog

- deal with nuts and tags being sparse arrays full of undefineds for each thing you've deleted. `track by $index` fixes duplicates in ng-repeat, but entries still show up in the DOM but are just hidden with ng-hide="!nut". kind of ugly.
  - might help https://github.com/angular/angular.js/issues/1286
- esc exits modal
- dynamically verticle center the contents of modal .circle

## QUESTIONS

- right now nuts automatically resort. like if you're sorting by latest modified and you start editing then unfocus, or by # of tags and you modify or add/remove tags, it jumps up. change? how? only $apply when you reselect sorting? could be annoying
- right now nuts only save on unfocus. that okay? if not, they will jump up when sorting by modified, would need to be fixed

### cloud storage

- data structure
  - users/uid/
    - nuts
    - tags
    - config - like id, name, email, password, last contact, data version #
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

### tags

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

### special queries

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
- customizeable views but two default: browser and note
  - browser: full screen, tag list, shows multiple results (tiny tiny section navigation icon), search bar, menu
  - note: windowed, (transparent bg?), larger section navigation chiclet,

## tags

- new tags automatically have random text color random bg color. work out some way to ensure they're always visible together. (is just brightness/value not to close alright? min saturation?). right click to randomize color to choose color
- pseudo tag "untagged"
- two options for what tags shown:
  - default: all tags
  - tags just in query (with numbers reflecting)
- hover gives you options to rename, delete, and change colors.
- does clicking add this tag to current nut, or add tag to query? both available in hover menu and configurable "default on click action" for tags?
- a tag may be defined as any search query. give example queries.
  - can you manually add nuts to a automatic tag
- duplicate tags names not allowed, but tag names are case sensitive

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

## RANDO

- maximum BSON size is 16mb. large documents with history may reach this. deal with/alert about/trim history/whatever
- have a hello message to users who open the JS console on nutmeg
- instead of framing $ for improvements as bounties, could be like conditional donations: i'll donate X if this feature/whatever gets built
- filtering with ng-repeat and ng-show may be slow for large number of nuts
- from inkpad: "Notes are automatically saved. Just like a paper notepad, all you have to do is write, InkPad takes care of saving your text. "

# Data Model

data to store:

- user info, status, and preferences
- notes (each with history, tags, metadata)
- tags (each with notes, tag relationships)

one collection/user vs 50 collections vs 1 collection for everyone, 50 probably best: http://www.colinhowe.co.uk/2012/jul/09/mongodb-collection-per-user-performance/

could have user collection which stored name of note collection. multiple users in same note collection.

# Resources

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

if you hit performance issues with lunr, could offload to a web-worker. can migrate to solr or something later.

every time you open up or switch to it (shouldn't be distracting actually...) like a popup in the corner with an autosuggestion you can approve or remove. could use automated summarization. "should this note about 'blah blah blah' have the 'blah' tag?""

# describing

- An API for your writing/text
- Evernote and Vim had a baby, and she was beautiful. Trello's the godmother.
- Git for creative writing
- Computational linguistics for the masses
