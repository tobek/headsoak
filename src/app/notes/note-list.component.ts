import {Component, Input, ElementRef} from 'angular2/core';

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
  el: HTMLElement;

  @Input() notes: Array<Note>;
  @Input() limit: number;

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
    this.scrollMonitor.scroll$.subscribe(this.infiniteScrollCheck.bind(this));
  }

  // @TODO/testing infinite scroll e2e both directions
  infiniteScrollCheck() {
    if (!this.notes || this.limit >= this.notes.length) {
      return;
    }

    var lastNote = this.el.querySelector('note:last-child');
    if (!lastNote) {
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
    else if (distanceTilLastNote > 2000 && this.limit > 15) { // @TODO this 15 should be dynamic
      // Let's see if we can hide some (2000 from already-calculated value so we don't waste time on this scroll event calculating more stuff)
      var tenthFromlastNote = this.el.querySelector('note:nth-last-child(11)'); // CSS has off-by-one shit
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
