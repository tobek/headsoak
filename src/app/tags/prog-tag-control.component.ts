import {Component, Input, ViewChild, ElementRef} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

import * as _ from 'lodash';
import * as ace from 'brace';

@Component({
  selector: 'prog-tag-control',
  template: require('./prog-tag-control.component.html')
})
export class ProgTagControlComponent {
  @Input() tag: Tag;

  @ViewChild('editorRef') editorRef: ElementRef;

  /** Whether the programmatic function string has changed since init. */
  changed = false;

  isRunning = false;

  /** Holds Ace editor instance */
  private editor;

  private _logger: Logger = new Logger(this.constructor.name);

  constructor(
    private analyticsService: AnalyticsService,
    private tagsService: TagsService,
  ) {
  }

  ngOnInit() {
  }

  ngOnDestroy() {
    if (this.editor) {
      this.editor.destroy();
      delete this.editor;
    }
  }

  ngAfterViewInit() {
    this.initializeEditor();
  }

  initializeEditor(): void {
    if (! this.editorRef) {
      return;
    }

    this.editor = ace.edit(this.editorRef.nativeElement);
    this.editor.setShowPrintMargin(false); // hides vertical ruler
    // this.editor.setTheme('ace/theme/dawn'); // @TODO/ece Lets pick a theme (later can be under user control). twilight is good. monokai is good. add in vendor.browser.ts

    const sesh = this.editor.getSession();
    sesh.setMode('ace/mode/javascript');
    sesh.setUseWrapMode(true);
    sesh.setTabSize(2);
    sesh.setUseSoftTabs(true);

    // this.editor.resize(); // doesn't seem necessary

    this.editorUnchanged();

    if (this.tag.readOnly) {
      this.editor.setOptions({
        readOnly: true,
        highlightActiveLine: false,
        highlightGutterLine: false
      });
      sesh.setUseWorker(false); // no syntax validation
    }
    else {
      sesh.setUseWorker(true); // does syntax validation
    }
  }

  editorUnchanged(): void {
    this.changed = false;
    this.editor.once('change', () => {
      this.changed = true;
    });
  }

  makeSmart(): void {
    if (this.tag.docs.length) {
      const singular = this.tag.docs.length === 1;
      const message = '<p>Warning: You currently have ' + this.tag.docs.length + ' note' + (singular ? '' : 's') + ' tagged with <span class="static-tag">' + this.tag.name + '</span>. ' + (singular ? 'It' : 'They') + ' will be untagged if ' + (singular ? 'it doesn\'t' : 'they don\'t') + ' return true for the function you enter below.</p><p>Are you sure you wish to continue?</p>';

      this.tagsService.dataService.modalService.confirm(
        message,
        (confirmed) => {
          if (confirmed) {
            this._makeSmart();
          }
        },
        true,
        'Make smart tag'
      );
    }
    else {
      this._makeSmart();
    }
  }

  _makeSmart(): void {
    this.tag.prog = true;

    if (this.tag.progFuncString) {
      // Must've had one from before
      this.tag.runProgOnAllNotes();
    }

    this.tag.updated();
  }

  makeDumb(): void {
    if (_.size(this.tag.docs)) {
      this.tagsService.dataService.modalService.confirm(
        'Notes that are already tagged with this tag will remain tagged, but this tag will no longer be automatically added to or removed from notes.',
        (confirmed) => {
          if (confirmed) {
            this._makeDumb();
          }
        },
      );
    }
    else {
      this._makeDumb();
    }
  }

  _makeDumb(): void {
    this.tag.prog = false;
    this.tag.progFuncString = this.editor.getValue();
    this.tag.updated();
    this.editorUnchanged();
  }

  revertChanges(): void {
    if (! this.changed) {
      return;
    }

    this.editor.setValue(this.tag.progFuncString || '');
    this.editor.gotoLine(0, 0); // deselect and go to beginning (setValue sometimes selects all and/or puts cursor at end)
    this.editorUnchanged();
  }

  saveAndRun(): void {
    if (! this.changed) {
      return;
    }
    
    this.tag.updateProgFuncString(this.editor.getValue());
    this.editorUnchanged();

    if (this.tag.progFuncString) {
      this.isRunning = true;
      // @TODO/webworkers @TODO/prog Wait 200ms (length of the transition to button loading state, which would pause while JS is busy) before starting, because running prog tags is synchronous (barring async calls written into them). Not ideal, and timeout can be removed when we're using web workers for running prog tags.
      setTimeout(() => {
        this.tag.runProgOnAllNotes();
        this.isRunning = false;
        this.tag.updated();
        // @TODO/prog Should show the results of running it here! Like # of notes it was tagged on. And a success message. Tooltip or toaster?
      }, 200);
    }
    else {
      this.tag.updated();
    }
  }
}
