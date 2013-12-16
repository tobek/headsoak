l = lunr(function () {
  this.field('body', {boost: 1});
  this.ref('id');
})
l.update({"body":"yo some words", "id": 0})
l.search("word") // returns one result
l.search("some") // returns no results

32768

## TODO

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
  - change creation date
  - export
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

## config

- searching for "importer" brings up a nut that itself contains the import tool (which, like all nuts, can be expanded to full screen mode). when you click on importer from the nutmeg menu, it simply inserts "importer" in to the query box. the menu teaches you the shortcuts - everything can be done through the query box/runner

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
