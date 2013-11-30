- customizeable views but two default: browser and note
  - browser: full screen, tag list, shows multiple results (tiny tiny section navigation icon), search bar, menu
  - note: windowed, (transparent bg?), larger section navigation chiclet,

32768

## Working On

- make dropdown let you sort tags (list from controller?)
- figure out sorting by length

#### cloud storage

- set up login + sessions (look at random confidant)
- set up mongo DB and build script for it
  - nuts collection per user
  - tags collection per user
  - users collection (each nut and tag has user id) which has id, name, email, password, last contact, data version #
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

The nutmeg tree could embody the server-side aspects of nutmeg - signing up, backups, syncing, etc. A silvery vector image of a sheltering tree could be used.

***

want to be able to search by strings of length 3 or more. should include all unicode characters but accented characters, for example, should be recognized and findable by their non-accented form. not case sensitive.

from inkpad: " Notes are automatically saved. Just like a paper notepad, all you have to do is write, InkPad takes care of saving your text. "

each note has:

- text
- date created
- date modified
- tags (tags with colons in them must be escaped in the data files - \:   there may be no line breaks)
  - data (no line breaks)
- index (integer which corresponds to the name of the data file containing it)

- store configuration (things like TIME_FORMAT) in a .cfg file
- need counts of how much nuts each tag has
- need to be able to sort by most recently created/modified
- implement method to rename tags (get list of every note with that tag, remove the old tag, add the new tag)

######===GUI===GUI===GUI===######

3 parts:

- search bar
- results
- tag browser

|===========|[  ]
|-----------|[  ]
[         ][  ]
[         ][  ]
[         ][  ]
[___________][__]

SEARCH BAR

- as you type, once you've hit two chars it begins to suggest a list of tags (appearing horizontally underneath, bolding the letters you've written) and you can press enter to auto-complete or tab to switch to different tag. it then becomes a button under the search bar
- two options for dealing with spaces
  - A: spaces entirely separate search terms, using quotes (like google) to search strictly
  - B: always strict, like searching notepad

RESULTS

- choose size of search-term-containing excerpt of each nut that is shown (shows whole nut when you click on it)
- sort by best match (coming from lunr), time, # of tags, length
- edit!

FORMATTING

bold, italic, underline, bulleted list, numbered list, links

TAG BROWSER

- sort options
  - most/least
  - newest/oldest
- tags with data
  - let's say we have source:economist and source:nytimes, etc. at first they are all 'source' and the number (or date, if sorted by date) is collective of all things with tag source. there can be a little plus on the left to expand, and then the other tags shift out of the way, and the separate source:X tags fade in in the appropriate spaces. you can right click and select "always expand this tag"
- how to apply tags?
- new tags automatically have random text color random bg color. work out some way to ensure they're always visible together. (is just brightness/value not to close alright? min saturation?). right click to randomize color to choose color
- pseudo tag "untagged"
- tag browser should be able to show tags just present in search query? with numbers reflecting
- hover gives you options to rename, delete, and change colors.
- does clicking add this tag to current nut, or add tag to query? both available in hover menu and configurable "default on click action" for tags?

TAGS, SUBTAGS, ETC.

- subtags such as source:tin drum create the child as its own tag linked for this nut as a subtag of source.
- can be nested infinitely
- you can also set a tag to be permanently a subtag of another tag, e.g. mood:happy such that whenever you use that tag happy, it's as if "mood:" is prepended

ACTIONS

- on any note you can change creation date, add/remove tags (deal like gmail with labels that some but not all in selection have), save?, export?, change name
- decide how to select
  - all tags
  - all results
  - selected results (how do you select, how do you show selections)
  - specific note
  - specific tag
  - selected tags?

### RANDO

- searching for "importer" brings up a nut that itself contains the import tool (which, like all nuts, can be expanded to full screen mode). when you click on importer from the nutmeg menu, it simply inserts "importer" in to the query box. the menu teaches you the shortcuts - everything can be done through the query box/runner
- maximum BSON size is 16mb. large documents with history may reach this. deal with/alert about/trim history/whatever
- have a hello message to users who open the JS console on nutmeg
- a tag may be defined as any search query. give example queries.
- instead of framing $ for improvements as bounties, could be like conditional donations: i'll donate X if this feature/whatever gets built

## special queries

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

## tag relationships

http://wordnetweb.princeton.edu/perl/webwn?o2=&o0=1&o8=1&o1=1&o7=&o5=&o9=&o6=&o3=&o4=&r=1&s=country&i=5&h=10100100000#c

- X is parent of Y
- X is related to Y
  - X and Y are of the same kind/list
  - X is the hypernym of Y (Y is a more specific example type of X)
  - Y is the hyponym of X

# Data Model

data to store:

- user info, status, and preferences
- notes (each with history, tags, metadata)
- tags (each with notes, tag relationships)

one collection/user vs 50 collections vs 1 collection for everyone, 50 probably best: http://www.colinhowe.co.uk/2012/jul/09/mongodb-collection-per-user-performance/

could have user collection which stored name of note collection. multiple users in same note collection.


# Resources

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

- Evernote and Vim had a baby, and she was beautiful. Trello's the godmother.
- Git for creative writing
- Computational linguistics for the masses
- An API for your writing