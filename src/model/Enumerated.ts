
// ensure we don't mix entity ids with other ids...
// usage: class_id<_Player> where _Player is an enum associated with the Player class
export type class_id<T> = number & T;
export class Enumerated<T> {

  public id: class_id<T>;

  /**
   * Must be supered
   */
  constructor(id: class_id<T>) {
    this.id = id;
  }
}

export type ID_Map<T, V> = Map<class_id<T>, V>