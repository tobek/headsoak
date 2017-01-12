import {Injectable} from '@angular/core';
import {ReplaySubject} from 'rxjs/ReplaySubject';

import {HomeComponent} from './home';
import {Note, NoteBrowserComponent, NoteComponent, NoteQueryComponent} from './notes';

@Injectable()
export class ActiveUIsService {
  private _home: HomeComponent;

  private _noteBrowser: NoteBrowserComponent;
  private _noteQuery: NoteQueryComponent;

  /** Note where the textarea currently has focus. */
  private _focusedNoteComponent: NoteComponent;

  /** Note which is open in the main writing area. May be the same as focusedNoteComponent. */
  // @REMOVED/write
  // private _openNoteComponent: NoteComponent;

  private _home$ = new ReplaySubject<HomeComponent>(1);
  private _noteBrowser$ = new ReplaySubject<NoteBrowserComponent>(1);
  private _noteQuery$ = new ReplaySubject<NoteQueryComponent>(1);
  private _focusedNoteComponent$ = new ReplaySubject<NoteComponent>(1);

  // @REMOVED/write
  // private _openNoteComponent$ = new ReplaySubject<NoteComponent>(1);

  // The following can be subscribed to to be notified of updates to the active UI. If there is a current truthy value, any subscription will immediately be called with that value. Subscribing with `.first().subscribe(...)` will call immediately with current truthy value if any and then unsubscribe, otherwise will be called when there *is* a truthy value and then unsubscribe.
  // (Filtering the private subject in the following declarations is what ensures that if the active UI is set to null, it doesn't replay or emit a null value.)
  public home$ = this._home$.filter(val => !! val);
  public noteBrowser$ = this._noteBrowser$.filter(val => !! val);
  public noteQuery$ = this._noteQuery$.filter(val => !! val);
  public focusedNoteComponent$ = this._focusedNoteComponent$.filter(val => !! val);
  
  // @REMOVED/write
  // public openNoteComponent$ = this._openNoteComponent$.filter(val => !! val);

  constructor(
  ) {
  }

  get home(): HomeComponent {
    return this._home;
  }
  get noteBrowser(): NoteBrowserComponent {
    return this._noteBrowser;
  }
  get noteQuery(): NoteQueryComponent {
    return this._noteQuery;
  }
  get focusedNoteComponent(): NoteComponent{
    return this._focusedNoteComponent;
  }
  // @REMOVED/write
  // get openNoteComponent(): NoteComponent {
  //   return this._openNoteComponent;
  // }

  set home(newVal: HomeComponent) {
    this._home = newVal;
    this._home$.next(newVal);
  }
  set noteBrowser(newVal: NoteBrowserComponent) {
    this._noteBrowser = newVal;
    this._noteBrowser$.next(newVal);
  }
  set noteQuery(newVal: NoteQueryComponent) {
    this._noteQuery = newVal;
    this._noteQuery$.next(newVal);
  }
  set focusedNoteComponent(newVal: NoteComponent){
    this._focusedNoteComponent = newVal;
    this._focusedNoteComponent$.next(newVal);
  }
  // @REMOVED/write
  // set openNoteComponent(newVal: NoteComponent) {
  //   this._openNoteComponent = newVal;
  //   this._openNoteComponent$.next(newVal);
  // }
}
