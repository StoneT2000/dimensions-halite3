import { Location } from "./Location";

/**
 * Template for classes representing grids indexable along two dimensions.
 * @tparam Entry The type of entries in the grid.
 */
export class Grid<Entry> {
  public width: number = 0;
  public height: number = 0;

  /** The internal data storage. */
  public grid: Array<Array<Entry>> = [];
  
  /**
   * Create a Grid from dimensions.
   * @param width The width.
   * @param height The height.
   */
  constructor(width: number = 0, height: number = 0) {
    this.width = width;
    this.height = height;
    for (let i = 0; i < height; i++) {
      let row: any[] = [];
      row.fill(null, 0, width);
      this.grid.push(row);
    }
  }
  to_json() {
    return {
      width: this.width,
      height: this.height,
      grid: this.grid.map((row) => {
        return row.map((entry) => {
          //@ts-ignore
          return entry.to_json(); // should have a to_json member function
        })
      })
    }
  }
  /**
   * Ge an entry at grid coordinates.
   * @param x The grid x-coordinate.
   * @param y The grid y-coordinate.
   * @return Reference to the entry at (x, y).
   */
  at(x: number, y: number): Entry {
    return this.grid[y][x];
  }
  /**
   * Get entry at a location.
   * @param location The location.
   * @return Reference to the entry at (x, y).
   */
  atLocation(location: Location): Entry {
    const {x, y} = location;
    return this.grid[y][x];
  }
}