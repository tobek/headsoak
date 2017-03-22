import {Component, Inject, forwardRef, Input, ViewChild, ElementRef} from '@angular/core';

import {AnalyticsService} from '../analytics.service';
import {Tag} from './';
import {TagsService} from './tags.service'; // Dunno why we can't import from tags/index.ts

import {Logger} from '../utils/';

import * as _ from 'lodash';
import * as ace from 'brace';

@Component({
  selector: 'prog-tag-control',
  templateUrl: './prog-tag-control.component.html'
})
export class ProgTagControlComponent {
  readonly DEFAULT_PROG_FUNC_STRING = `// Any initialization logic can go here - this is run each time the app is initialized, and whenever the smart tag is changed

function classifyNote(note) {
  // This function will get run against each of your notes, and should return true (if this note should have this tag) or false. (See documentation below for more complex return types for child tags and scores.)
}

return classifyNote;`;
  @Input() tag: Tag;

  /** Whether we're showing a smart tag library tag, in which case almost everything is hidden. */
  @Input() progTagLibTag = false;

  @ViewChild('editorRef') editorRef: ElementRef;

  /** Whether the programmatic function string has changed since init. */
  changed = false;

  isRunning = false;

  /** Holds Ace editor instance */
  private editor;

  private _logger: Logger = new Logger('ProgTagControlComponent');

  constructor(
    private analyticsService: AnalyticsService,
    @Inject(forwardRef(() => TagsService)) private tagsService: TagsService
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
    this.editor.setFontSize(14); // @HACK The elements inherit our global typography styles (defaulting at 14px) but Ace seems to get confused and it throws off cursor alignment unless we explicitly set it right here. @TODO/polish Ideally we could dynamically pick it up (but from where are we canonically assured to get the "normal" font size? `body` is actually set to 16px for rem sizing) in case it's ever changed
    // this.editor.setTheme('ace/theme/dawn'); // @TODO/ece Lets pick a theme (later can be under user control). twilight is good. monokai is good. add in vendor.browser.ts

    const sesh = this.editor.getSession();
    sesh.setMode('ace/mode/javascript');
    sesh.setUseWrapMode(true);
    sesh.setTabSize(2);
    sesh.setUseSoftTabs(true);

    // Not always necessary, but for instance in prog tag library tag modal it is
    setTimeout(this.editor.resize.bind(this.editor), 0);

    this.editorUnchanged();

    if (this.tag.readOnly || this.tag.fromLib) {
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

  setEditorValue(newVal: string) {
    this.editor.setValue(newVal);
    this.editor.gotoLine(0, 0); // deselect and go to beginning (setValue sometimes selects all and/or puts cursor at end)
  }

  makeSmart(): void {
    if (this.tag.noteCount) {
      const singular = this.tag.noteCount === 1;
      const message = '<p>Warning: You currently have ' + this.tag.noteCount + ' note' + (singular ? '' : 's') + ' tagged with <span class="static-tag">' + _.escape(this.tag.name) + '</span>. ' + (singular ? 'It' : 'They') + ' will be untagged if ' + (singular ? 'it doesn\'t' : 'they don\'t') + ' return true for the function you enter below.</p><p>Are you sure you wish to continue?</p>';

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
      this.run();
    }

    this.tag.updated();
  }

  makeDumb(): void {
    if (_.size(this.tag.docs)) {
      this.tagsService.dataService.modalService.confirm(
        'The ' + this.tag.noteCount + ' note' + (this.tag.noteCount === 1 ? '' : 's') + ' already tagged with this tag will remain tagged, but this tag will no longer be automatically added to or removed from notes.',
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

    this.setEditorValue(this.tag.progFuncString || this.DEFAULT_PROG_FUNC_STRING);
    this.editorUnchanged();
  }

  saveAndRun(): void {
    if (! this.changed) {
      return;
    }

    this.tag.updateProgFuncString(this.editor.getValue());
    this.editorUnchanged();

    if (this.tag.progFuncString) {
      this.run();
    }
    else {
      this.tag.updated();
    }
  }

  run(): void {
    this.isRunning = true;
    const err = this.tag.setUpAndValidateProgTag();

    if (err) {
      this.tagsService.dataService.modalService.generic({
        message: '<p>The code for this smart tag threw an error or did not return a valid classifier. Please see documentation for details on the expected format.</p><pre class="syntax" style="max-height: 50vh">' + _.escape(err.stack || err.toString()) + '</pre>',
        additionalButtons: [
          {
            text: 'Revert to default smart tag boilerplate',
            cb: () => {
              this.tag.progFuncString = this.DEFAULT_PROG_FUNC_STRING;
              this.setEditorValue(this.tag.progFuncString);
            }
          }
        ]
      });
      this.isRunning = false;
      return;
    }

    // We might have updated it while validating it:
    if (this.tag.progFuncString !== this.editor.getValue()) {
      this.setEditorValue(this.tag.progFuncString);
    }

    if (! this.tag.classifier) {
      // We're done now
      this.tag.updated();
      this.isRunning = false;
      return;
    }

    // @TODO/webworkers @TODO/prog Wait 200ms (length of the transition to button loading state, which would pause while JS is busy) before starting, because running prog tags is synchronous (barring async calls written into them). Not ideal, and timeout can be removed when we're using web workers for running prog tags.
    setTimeout(() => {
      this.tag.runClassifierOnAllNotes((err?) => {
        if (err) {
          // @TODO/prog Do we want to handle this here?
        }
        this.isRunning = false;
        this.tag.updated();
        // @TODO/prog Should show the results of running it here! Like # of notes it was tagged on. And a success message. Tooltip or toaster?
      });
    }, 200);
  }
}
