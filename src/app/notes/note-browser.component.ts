import {Component, Output, ElementRef, /*ViewChildren, QueryList,*/ EventEmitter} from '@angular/core';
import {Router, NavigationEnd} from '@angular/router';
import {Subscription} from 'rxjs';

import {ActiveUIsService} from '../active-uis.service';
import {AnalyticsService} from '../analytics.service';
// import {SettingsService} from '../settings/settings.service';
import {Note} from './note.model';
import {NoteComponent} from './note.component';
import {NotesService} from './notes.service';
import {Logger, ScrollMonitorService} from '../utils/';

@Component({
  selector: 'note-browser',
  pipes: [],
  directives: [
    NoteComponent,
  ],
  template: require('./note-browser.component.html')
})
export class NoteBrowserComponent {
  DEFAULT_NOTES_LIMIT: number = 20;

  el: HTMLElement;

  /** The elements in this array reference Note objects from NotesService. @NOTE Since we feed this through the pure ArrayLimitPipe, the pipe won't re-evaluate if this array is mutated, only if this.notes is actually reassigned to a different array (unless we make it an unpure pipe, which is costly). */
  notes: Array<Note> = [];

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_NOTES_LIMIT;

  @Output() noteOpened = new EventEmitter<Note>();
  @Output() noteClosed = new EventEmitter<Note>();

  // @ViewChildren(NoteComponent) noteComponents: QueryList<NoteComponent>;

  private querySub: Subscription;
  private scrollSub: Subscription;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private router: Router,
    private activeUIs: ActiveUIsService,
    private analyticsService: AnalyticsService,
    // private settings: SettingsService,
    private scrollMonitor: ScrollMonitorService,
    private notesService: NotesService,
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    this.activeUIs.noteQuery$.first().subscribe(this.init.bind(this));

    this.scrollSub = this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  ngOnDestroy() {
    this.querySub.unsubscribe();
    this.scrollSub.unsubscribe();

    if (this.activeUIs.noteBrowser === this) {
      this.activeUIs.noteBrowser = null;
    }
  }

  init(noteQueryComponent): void {
    this.querySub = noteQueryComponent.queriedNotes$.subscribe((notes: Note[]) => {
      this.notes = notes;
      // Wait for these notes to get set up and then see if this.limit needs changing
      setTimeout(this.infiniteScrollCheck.bind(this), 0);
    });

    // @TODO/rewrite
    // $timeout($s.n.autosizeAllNuts);

    this.activeUIs.noteBrowser = this;
  }

  _noteOpened(note: Note): void {
    // @TODO If we have to do this again (we do something very similar in Shortcut model) we should wrap a service around the Router and have a `routeThenDo` function.
    if (this.router.url !== '/') {
      this.router.events
        .filter(event => event instanceof NavigationEnd)
        .first().subscribe((event) => {
          // @HACK Not sure why but this additional setTimeout is necessary to focus to work, it seems
          setTimeout(() => {
            this.noteOpened.emit(note);
          });
        });
      this.router.navigateByUrl('/');
    }
    else {
      this.noteOpened.emit(note);
    }
  }

  _noteClosed(note: Note): void {
    this.noteClosed.emit(note);
  }

  // @TODO/testing infinite scroll e2e both directions
  infiniteScrollCheck(): void {
    if (['/', '/browse', '/scroll'].indexOf(this.router.url) === -1) {
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

      // @TODO/rewrite
      // $s.n.autosizeSomeNuts($s.n.nutsLimit - 10); // only the new ones
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
