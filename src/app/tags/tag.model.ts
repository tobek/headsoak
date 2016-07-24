export class Tag {
  id: string;
  name: string;
  created: number;
  modified: number;

  // Optional:
  docs: string[]; // array of note IDs
  prog: boolean; // whether it's a programmatic tag @TODO/rewrite can't we just use the progFuncString?
  progFuncString: string; // string representing programmatic tag function to be eval'd
  readOnly: boolean; // @TODO/old handle other permissions @TODO/rewrite this still needed here?

  share: any; // map of recipient (shared-with) user ID to their permissions
  sharedBy: string; // ID of user that shared this tag
  shareTooltip: string; // text to identify sharing status to user (e.g. "you are sharing this with ___" or "___ is sharing this with you")


  // @TODO how do we handle duplicate names?
  constructor(tagData: any) {
    if (! tagData.id || ! tagData.name) {
      throw new Error('Must supply tag with id and name');
    }

    _.extend(this, tagData);

    _.defaults(this, {
      docs: [],
      created: Date.now(),
      modified: Date.now(),
    });

    // @TODO/old if `docs` exists, go through and add to each nut?

    // @TODO/rewrite/tags
    // this.tagUpdated(newId);
  }
}
