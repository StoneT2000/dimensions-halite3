import { Location } from "./Location";

/**
 * Template for classes representing grids indexable along two dimensions.
 * @tparam Entry The type of entries in the grid.
 */
export class Grid<Entry> {
  public width: number = 0;
  public height: number = 0;

  /** The internal data storage. */
  public grid: Array<Array<Entry>>;
  
  constructor();
  /**
   * Create a Grid from dimensions.
   * @param width The width.
   * @param height The height.
   */
  constructor(width: number = 0, height: number = 0) {
    this.width = width;
    this.height = height;
    for (let i = 0; i < width; i++) {
      let row = [];
      row.fill(null, 0, height);
      this.grid.push(row);
    }
  }
  to_json() {

  }
  /**
   * Ge an entry at grid coordinates.
   * @param x The grid x-coordinate.
   * @param y The grid y-coordinate.
   * @return Reference to the entry at (x, y).
   */
  at(x: number, y: number);
  /**
   * Get entry at a location.
   * @param location The location.
   * @return Reference to the entry at (x, y).
   */
  at(a1, a2) {
    if (a1 instanceof Location) {
      let location = a1;
      const {x, y} = location;
      return[y][x];
    }
    else if (typeof a1 == 'number') {
      return [a2][a1];
    }
  }
}