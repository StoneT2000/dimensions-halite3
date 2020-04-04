import { Map as GameMap } from "../model/Map";
import { Constants } from "../Constants";
import { TileGenerator } from "./TileGenerator";
import { MapParameters } from "./GeneratorBase";

export class BlurTileGenerator extends TileGenerator{
  blur_function(y_coord: number, x_coord: number, map: GameMap) {
    // bring into local scope for shorter naming
    const BLUR_FACTOR = Constants.BLUR_FACTOR;
    // Weight of a neighbor's effect on a cell's production value is dependent on the number of neighbors being considered
    // Declare as local constant as rest of function code is also implicitly dependent on the number of neighbors
    const NUM_NEIGHBORS = 4;

    // Blur function looks only at immediate neighbors of a tile, wrapping around the edges of the tile as needed
    let left_coord = (x_coord - 1 + this.tile_width) % this.tile_width;
    let right_coord = (x_coord + 1) % this.tile_width;
    let above_coord = (y_coord - 1 + this.tile_height) % this.tile_height;
    let below_coord = (y_coord + 1) % this.tile_height;

    // In determining post blur production value, give current production value of cell weight BLUR_FACTOR
    // and production of neighbors weight (1 - BLUR_FACTOR)
    // This means that *each* neighbor's production gets weight (1 - BLUR_FACTOR) / 4
    // Truncate fractions via cast
    return Math.floor(map.at(x_coord, y_coord).energy * BLUR_FACTOR
            + map.at(left_coord, y_coord).energy * (1 - BLUR_FACTOR) / NUM_NEIGHBORS
            + map.at(right_coord, y_coord).energy * (1 - BLUR_FACTOR) / NUM_NEIGHBORS
            + map.at(x_coord, above_coord).energy * (1 - BLUR_FACTOR) / NUM_NEIGHBORS
            + map.at(x_coord, below_coord).energy * (1 - BLUR_FACTOR) / NUM_NEIGHBORS);
  }
  constructor(parameters: MapParameters) {
    super(parameters);
  }
  generate(map: GameMap): void {
    let tile = new GameMap(this.tile_width, this.tile_height);
    // const auto max = static_cast<double>(std::mt19937::max());
    const max = 4294967295; // from http://www.cplusplus.com/reference/random/mersenne_twister_engine/max/

    // Fetch max and min values for square production and store for ease of use
    const MIN_CELL_PROD = Constants.MIN_CELL_PRODUCTION;
    const MAX_CELL_PROD = Constants.MAX_CELL_PRODUCTION;
    for (let row = 0; row < this.tile_height; row++) {
        for (let col = 0; col < this.tile_width; col++) {
            // randomly generate a production value using generator class' random number generator
            let production = Math.floor(this.rng.random_int() / max * (MAX_CELL_PROD - MIN_CELL_PROD) + MIN_CELL_PROD);
            // tile.at(col, row).energy = production;
            // console.log(row, col, this.tile_height, this.tile_width);
            tile.grid[row][col].energy = production;
            
        }
    }

    // For each cell, use the blur function to determine new production value for cell based on neighboring cell values
    // Blurring will create regression to mean, so additionally keep track of max value to later ensure full use of
    // production range
    let max_seen_prod = 0;
    for (let row = 0; row < this.tile_height; ++row) {
        for (let col = 0; col < this.tile_width; ++col) {
            // production is a private member, so create new cell with new production value
            const post_blur_prod = this.blur_function(row, col, tile);
            if (post_blur_prod > max_seen_prod) max_seen_prod = post_blur_prod;
            // tile.at(col, row).energy = post_blur_prod;
            tile.grid[row][col].energy = post_blur_prod;
        }
    }

    // Do a second pass over the tile to scale relative to post blur production, but to still get full range of
    // production values
    for (let row = 0; row < this.tile_height; ++row) {
        for (let col = 0; col < this.tile_width; ++col) {
            const post_normalized_prod = Math.floor(tile.at(col, row).energy * MAX_CELL_PROD / max_seen_prod);
            // tile.at(col, row).energy = post_normalized_prod;
            tile.grid[row][col].energy = post_normalized_prod;
        }
    }

    const factory_pos_x = Math.floor((this.rng.random_int() / max) * this.tile_width);
    const factory_pos_y = Math.floor((this.rng.random_int() / max) * this.tile_height);
    // Use superclass function to copy the tile over the entire map, including placing all factories
    this.tile_map(map, factory_pos_y, factory_pos_x, tile);
  }
}