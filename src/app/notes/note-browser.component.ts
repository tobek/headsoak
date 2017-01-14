import {Component, Output, ElementRef, ViewChildren, QueryList, EventEmitter} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
import {SettingsService} from '../settings/settings.service';
import {Note} from './note.model';
import {NoteComponent} from './note.component';
import {NotesService} from './notes.service';
import {Tag} from '../tags/';
import {Logger} from '../utils/';
import {ScrollMonitorService} from '../utils/scroll-monitor.service';
import {NOTE_BROWSER_ROUTES} from '../app.routes';

import * as _ from 'lodash';

@Component({
  selector: 'note-browser',
  template: require('./note-browser.component.html')
})
export class NoteBrowserComponent {
  DEFAULT_NOTES_LIMIT: number = 20;

  el: HTMLElement;

  /** The elements in this array reference Note objects from NotesService. @NOTE Since we feed this through the pure ArrayLimitPipe, the pipe won't re-evaluate if this array is mutated, only if this.notes is actually reassigned to a different array (unless we make it an unpure pipe, which is costly). */
  notes: Array<Note> = [];

  newNote: Note;

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_NOTES_LIMIT;

  // @REMOVED/write
  // @Output() noteOpened = new EventEmitter<Note>();
  // @Output() noteClosed = new EventEmitter<Note>();

  @ViewChildren(NoteComponent) noteComponents: QueryList<NoteComponent>;

  private subscriptions: Subscription[] = [];

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private router: Router,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    private settings: SettingsService,
    private scrollMonitor: ScrollMonitorService,
    private notesService: NotesService,
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    this.activeUIs.noteQuery$.first().subscribe(this.init.bind(this));

    this.subscriptions.push(this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this)));
  }

  ngOnDestroy() {
    for (var i = 0; i < this.subscriptions.length; ++i) {
      this.subscriptions[i].unsubscribe();
    }

    if (this.activeUIs.noteBrowser === this) {
      this.activeUIs.noteBrowser = null;
    }
  }

  init(noteQueryComponent): void {
    this.subscriptions.push(noteQueryComponent.queriedNotes$.subscribe(
      this.queriedNotesUpdated.bind(this)
    ));

    this.subscriptions.push(this.router.events
      .filter(event => event instanceof NavigationEnd)
      .subscribe(this.routeUpdated.bind(this)));

    this.activeUIs.noteBrowser = this;

    this.ensureNewNoteSetUp();
    this.activeUIs.noteQuery$.first().subscribe((noteQuery) => {
      this.subscriptions.push(noteQuery.tagsUpdated$.subscribe(
        this.queriedNoteTagsUpdated.bind(this)
       ));
    });

    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) !== -1) {
      this.goToNewNote();
    }

    this.subscriptions.push(this.notesService.noteUpdated$.subscribe(
      this.noteUpdated.bind(this)
    ));
  }

  queriedNotesUpdated(notes: Note[]): void {
    if (this.newNote) {
      this.notes = _.filter(notes, (note) => note.id !== this.newNote.id);
    }
    else {
      this.notes = notes;
    }

    // Wait for these notes to get set up and then see if this.limit needs changing
    setTimeout(this.infiniteScrollCheck.bind(this), 0);

    this.ensureNewNoteSetUp();
  }

  queriedNoteTagsUpdated(): void {
    // Since the UI is changing anyway, take this as an opportunity to make sure a new note is set up, shifting out existing "new" note if necessary
    this.ensureNewNoteSetUp(true, true);
  }

  routeUpdated(event: NavigationEnd) {
    if (NOTE_BROWSER_ROUTES.indexOf(event.url) !== -1) {
      // Wait a sec til new section's all sorted out
      setTimeout(() => {
        this.noteComponents.forEach((noteComponent) => {
          // @REMOVED/note text overflow
          // noteComponent.checkTextOverflow();
          noteComponent.checkTagOverflow();
        });
      });
    }

    // Since the UI is changing anyway, take this as an opportunity to make sure a new note is set up, shifting out existing "new" note if necessary
    this.ensureNewNoteSetUp(true, true);
  }

  /** Makes sure we have set up a blank new note for the user to be able to use as soon as they open the app. Optionally can replace the existing "new" note, shunting that into `this.notes` if desired.
   *
   * We pass no second argument to `createNote` so that the note isn't saved to data store. As soon as they make anything that calls `note.update` (editing text, adding tag, sharing), it'll get saved to data store. */
  ensureNewNoteSetUp(forceNewNote = false, preserveExisting = false): void {
    if (this.newNote && this.newNote.new && ! this.newNote.body) {
      // Untouched new note in here so no need to do anything, let's just make sure it has the right tags
      this.setUpNewNoteTags();
      return;
    }

    if (this.newNote && forceNewNote && preserveExisting) {
      // We're making a new note and keeping the note that *used* to be the new note, cause it has changes
      this.newNote.blurred(); // ensures that full update is called etc.
      this.notes = [this.newNote].concat(this.notes);
    }

    if (! this.newNote || forceNewNote) {
      this._logger.log('Setting up new unsaved note');
      this.newNote = this.notesService.createNote({});
      this.newNote.new = true;
      this.setUpNewNoteTags();

      // // Wait til the note component actually exists
      // setTimeout(() => {
      //   const newNoteEl = this.noteComponents.first.el.nativeElement;
      //   const newNoteVertOffset = jQuery(newNoteEl).outerHeight(true); // includes padding, border, and margin
      //   console.log('new note offset!', newNoteVertOffset);
      // }, 0);
    }
  }

  setUpNewNoteTags(): void {
    if (! this.newNote.new) {
      return;
    }

    if (! this.settings.get('addQueryTagsToNewNuts')) {
      this.newNote.tags = [];
      return;
    }

    if (this.activeUIs.noteQuery) {
      this.newNote.tags = this.activeUIs.noteQuery.tags
        .filter((tag: Tag) => ! tag.prog && ! tag.readOnly)
        .map((tag: Tag) => tag.id);
    }
  }

  noteUpdated(note: Note): void {
    if (note.deleted && note === this.newNote) {
      this.ensureNewNoteSetUp(true);
    }
  }

  goToNewNote(thenFocus = true): void {
    this.ensureNewNoteSetUp(true, true);

    // Now we have an untouched new note open
    if (thenFocus) {
      // Wait for component to get set up
      setTimeout(() => {
        this.noteComponents.first.bodyFocus();

        // There's something weird with the `HostBinding`s not firing properly on this new component, so uh just add this manually:
        this.noteComponents.first.el.nativeElement['classList'].add('is--focused');
      }, 0);
    }
  }

  goToNewNoteAddTag(): void {
    this.goToNewNote(false);

    // Wait for component to get set up
    setTimeout(() => {
      this.noteComponents.first.initializeAddTag();
    }, 0);

    // this.noteComponent.cdrRef.detectChanges(); // this was necessary when new note happened in/from note browser but no longer seems necessary, but keeping it here for reference.
  }

  goToNewNoteWithSameTags(note: Note): void {
    this.goToNewNote();
    
    this.newNote.tags = note.tags.filter((tagId: string) => {
      const tag = this.notesService.dataService.tags.tags[tagId];
      return ! tag.prog && ! tag.readOnly;
    });
  }


  // @REMOVED/write
  // _noteOpened(note: Note): void {
  //   // @TODO If we have to do this again (we do something very similar in Shortcut model) we should wrap a service around the Router and have a `routeThenDo` function.
  //   if (this.router.url !== '/') {
  //     this.router.events
  //       .filter(event => event instanceof NavigationEnd)
  //       .first().subscribe((event) => {
  //         // @HACK Not sure why but this additional setTimeout is necessary to focus to work, it seems
  //         setTimeout(() => {
  //           this.noteOpened.emit(note);
  //         });
  //       });
  //     this.router.navigateByUrl('/');
  //   }
  //   else {
  //     this.noteOpened.emit(note);
  //   }
  // }

  // @REMOVED/write
  // _noteClosed(note: Note): void {
  //   this.noteClosed.emit(note);
  // }

  // @TODO/optimization I think this is triggering change detection? Only should if we actually update stuff. (scrollmonitor itself might be the culprit)
  infiniteScrollCheck(): void {
    if (NOTE_BROWSER_ROUTES.indexOf(this.router.url) === -1) {
      return;
    }

    if (! this.notes || this.limit >= this.notes.length) {
      return;
    }

    const lastNote = this.el.querySelector('note:last-child');
    if (! lastNote) {
      return;
    }

    const scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    const viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
    const distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

    if (distanceTilLastNote < 500) {
      this.limit += 10;

      this._logger.log('Showing more notes: now showing', this.limit);
    }
    else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
      let tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
      if (! tenthFromlastNote) {
        return;
      }

      if (tenthFromlastNote.getBoundingClientRect().top - viewportBottomPos > 500) {
        this.limit -= 10;

        this._logger.log('Showing fewer nuts: now showing', this.limit);
      }
    }
  }

}
