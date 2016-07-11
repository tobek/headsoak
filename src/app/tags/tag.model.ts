export class Tag {
  id: string;

  // Optional:
  docs: Array<string>; // array of note IDs

  constructor(tagObj: any) {
    if (! tagObj.id) {
      throw new Error('Must supply a tag id');
    }

    _.extend(this, tagObj);

    _.defaults(this, {
      docs: [],
    });

  }
}
