import { Location, Direction } from "./Location";
import { Grid } from "./Grid";
import { Cell } from "./Cell";

export class Map extends Grid<Cell> {
  public factories: Array<Location> = [];
  static NEIGHBOR_COUNT = 4;
  to_json() {
    return {
      height: this.height,
      width: this.width,
      grid: this.grid.map((row) => {
        return row.map((cell) => cell.to_json());
      })
    };
  }

  /**
   * Given a location of a cell, return its neighbors.
   * @param location The location of the cell we want the neighbors of.
   * @return Array of neighbor locations.
   *  A neighbor is a location with Manhattan distance 1 from the input location.
   *  This function encapsulates the wrap-around map -
   *  i.e. cell (0, 0)'s neighbors include cells at the very bottom and very right of the map.
   */
  get_neighbors(location: Location): Array<Location> {
    const {x, y} = location;
    return [
      new Location((x+1) % this.width, y),
      new Location((x-1 + this.width) % this.width, y),
      new Location(x, (y+1) % this.height),
      new Location(x, (y-1 + this.height) % this.height)
    ]
  }
  /**
   * Calculate the Manhattan distance between two cells on a grid.
   *
   * @param from location of the first cell.
   * @param to The location of the second cell.
   * @return The Manhattan distance between the cells, calculated on a wrap-around map.
   */
  distance(from: Location, to: Location) {
    const [from_x, from_y] = [from.x, from.y];
    const [to_x, to_y] = [to.x, to.y];
    const x_dist = Math.abs(from_x - to_x);
    const y_dist = Math.abs(from_y - to_y);
    return Math.min(x_dist, this.width - x_dist) + Math.min(y_dist, this.height - y_dist);
  }
  /**
   * Move a location in a direction.
   * @param location The location to move.
   * @param direction The direction to move it in.
   */  
  move_location(location: Location, direction: Direction) {
    let {x, y} = location;
    switch (direction) {
    case Direction.North:
        location.y = (y + this.height - 1) % this.height;
        break;
    case Direction.South:
        location.y = (y + 1) % this.height;
        break;
    case Direction.East:
        location.x = (x + 1) % this.width;
        break;
    case Direction.West:
        location.x = (x + this.width - 1) % this.width;
        break;
    case Direction.Still:
        // Don't move
        break;
    }
  }
  /**
   * Create a Map from dimensions.
   * @param width The width.
   * @param height The height.
   */
  constructor(width: number, height: number) {
    super(width, height);
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        this.grid[i][j] = new Cell();
      }
    }
  }
  // Map(dimension_type width, dimension_type height) : Grid(width, height) {}
}