export class Note {
  id: string;
  body: string;
  created: number;
  modified: number;

  // Optional:
  readOnly: Boolean;
  share: { [uid: string]: boolean };
  sharedBy: string;
  sharedBody: string;
  tags: Array<string>; // Array of tag IDs

  constructor(noteObj: any) {
    if (! noteObj.id) {
      throw new Error('Must supply a note id');
    }

    _.extend(this, noteObj);

    // @TODO/rewrite
    // // if we've specifically passed in tags on this nut, use those. otherwise, maybe use query-filtering tags
    // if (! nut.tags && $s.c.config.addQueryTagsToNewNuts && $s.q.tags && $s.q.tags.length > 0) {
    //   nut.tags = $s.q.tags.filter(function(tagId) {
    //     // remove prog and readOnly tags
    //     return (! $s.t.tags[tagId].prog && ! $s.t.tags[tagId].readOnly);
    //   })
    // }

    _.defaults(this, {
      body: '',
      tags: [],
      created: Date.now(),
      modified: Date.now(),
      // history: [], // an array of notes, last is the latest
    });

    // @TODO/rewrite/tags
    // if (this.tags && this.tags.length > 0) {
    //   // Add this doc id to each of the tags
    //   this.tags.forEach(function(tagId){
    //     $s.n.addTagIdToNut(tagId, this.id);
    //   });
    // }

    // @TODO/rewrite
    // // If user was disconnected while editing a note, we won't have done a full update (which we only do on blur), so do that now
    // if (this.fullUpdateRequired) {
    //   console.log('note ' + this.id + ' was saved but requires a full update');
    //   $s.n.noteDoFullUpdate(note);
    // }

    // @TODO/rewrite
    // this.nutUpdated(newId); // saves state in history, updates index, etc.

    // @TODO/rewrite
    // // ensure that the new nut is visible and on top regardless of sort or search query
    // $s.n.nutsDisplay.unshift($s.n.nuts[newId]);

    // @TODO/rewrite - do we want these here?
    // $s.n.focusOnNutId(newId);
    // $s.n.autosizeAllNuts();

    // console.log('New note created:', this);
  }
}
