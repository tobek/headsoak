import {Component, ElementRef} from 'angular2/core';

import {AnalyticsService} from '../analytics.service';
import {Note} from './note.model';
import {NoteComponent} from './note.component';
import {NotesService} from './notes.service';
import {Logger, ScrollMonitorService} from '../utils/';

@Component({
  selector: 'note-list',
  pipes: [],
  directives: [
    NoteComponent,
  ],
  styles: [require('./note-list.component.css')],
  template: require('./note-list.component.html')
})
export class NoteListComponent {
  DEFAULT_NOTES_LIMIT: number = 15;

  el: HTMLElement;

  /** Dynamically generated partial or complete copy of notes, sorted and filtered according to the user. **Each element of the array is a reference to a Note object in `NotesService`.** This means that neither `NotesService.notes` nor `notes` here should directly reassign any of its elements, or else things will go out of sync. @TODO/toby this comment was from old nutmeg, only modified to update variable names - is it still accurate? */
  notes: Array<Note>;

  /** Only show this many nuts at a time unless infinite scrolling. */
  limit: number = this.DEFAULT_NOTES_LIMIT;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private elRef: ElementRef,
    private analyticsService: AnalyticsService,
    private scrollMonitor: ScrollMonitorService,
    private notesService: NotesService
  ) {
    this.el = elRef.nativeElement;
  }

  ngOnInit() {
    if (! _.isEmpty(this.notesService.notes)) {
      this.initNotes();
    }
    else {
      var subscription = this.notesService.updates$.subscribe(() => {
        this.initNotes();
        subscription.unsubscribe;
      });
    }

    this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  initNotes() {
    this.notes = this.notesService.sortNotes();

    // @TODO/rewrite
    // $timeout($s.n.autosizeAllNuts);
  }

  // @TODO/testing infinite scroll e2e both directions
  infiniteScrollCheck() {
    if (! this.notes || this.limit >= this.notes.length) {
      return;
    }

    var lastNote = this.el.querySelector('note:last-child');
    if (! lastNote) {
      return;
    }

    var scrollPos = document.documentElement.scrollTop || document.body.scrollTop;
    var viewportBottomPos = scrollPos + window.innerHeight; // Distance from top of document to bottom of viewport
    var distanceTilLastNote = lastNote.getBoundingClientRect().top - viewportBottomPos;

    if (distanceTilLastNote < 500) {
      this.limit += 10;

      this._logger.log('Showing more notes: now showing', this.limit);

      // @TODO/rewrite
      // $s.n.autosizeSomeNuts($s.n.nutsLimit - 10); // only the new ones
    }
    else if (distanceTilLastNote > 1000 && this.limit > this.DEFAULT_NOTES_LIMIT) {
      var tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS is off-by-one =(
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
