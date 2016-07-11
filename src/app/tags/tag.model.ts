export class Tag {
  id: string;
  name: string;
  created: number;
  modified: number;

  // Optional:
  docs: Array<string>; // array of note IDs

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
