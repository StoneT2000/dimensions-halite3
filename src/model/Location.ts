
export enum Direction {
  North = 'n',
  South = 's',
  East = 'e',
  West = 'w',
  Still = 'o',
};

export class Location {

  /**
   * Construct Location from coordinates.
   * @param x The x-coordinate.
   * @param y The y-coordinate.
   */
  constructor(public x: number, public y: number) {

  }

  /**
   * Compare to another Location by equality.
   * @param location The other Location.
   * @return True if this Location is equal to the other.
   */
  public equals(loc: Location) {
    return this.x === loc.x && this.y === loc.y
  }

  to_json() {
    return JSON.stringify({
      x: this.x,
      y: this.y
    });
  }
  toString() {
    return `(${this.x}, ${this.y})`
  }
}