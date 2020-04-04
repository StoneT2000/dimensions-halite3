import { Map } from "../model/Map";

import { Logger } from "dimensions-ai";
import { Location } from "../model/Location";
import { MapParameters, GeneratorBase } from "./GeneratorBase";




export class TileGenerator extends GeneratorBase {
  public log = new Logger();
  public num_tile_rows = 0; /**< number of rows of tiles in map */
  public num_tile_cols = 0; /**< number of cols of tiles in map */
  public width = 0;         /**< width (in cells) of the final map */
  public height = 0;        /**< height (in cells) of the final map */

  public num_players = 0;    /**< number of players who will be on the map */
  public tile_width = 0;    /**< width (in cells) of a single tile */
  public tile_height = 0;   /**< width (in cells) of a single tile */

  constructor(parameters: MapParameters) {
    super(parameters);
    this.width = parameters.width;
    this.height = parameters.height;
    this.num_players = parameters.numPlayers;
    // Ensure that the map can be subdivided into partitions for a given number of players
    // ie: a 64x64 map cannot be (most basic definition of) symmetrical for 6 players
    if ((this.width * this.height) % this.num_players != 0) {
      this.log.error(`The map size given must be evenly divisible by the number of players. A map size of ${this.width} x ${this.height} with area of ${this.width * this.height} violates that for ${this.num_players} players.`)
    }

    // We want our map to be as square-like as possible, so to find the size of a tile, first determine
    // how many tiles we will have
    this.num_tile_rows = Math.floor(Math.sqrt(this.num_players));
    while (this.num_players % this.num_tile_rows != 0) {
        this.num_tile_rows--;
    }
    this.num_tile_cols = Math.floor(this.num_players / this.num_tile_rows);

    // next, use number of rows and cols of player start tiles to determine height and width of a single tile
    this.tile_width = Math.floor(this.width / this.num_tile_cols);
    this.tile_height = Math.floor(this.height / this.num_tile_rows);

    // console.log('Players ' + this.num_players,' Map size:', this.width, 'x', this.height,'| Tile: ',this.tile_width, 'x',this.tile_height);

    // Ensure these tiles then make up the whole map
    if (!(this.tile_width * this.num_tile_cols == this.width && this.tile_height * this.num_tile_rows == this.height)) {
      this.log.error(`Map must be able to be created by copying one tile over the whole map. For the given number of players we have a ${this.tile_width} x ${this.tile_height} tile, which cannot perfectly tile the given map size, ${this.width} x ${this.height}. Try using map dimensions that arre powers of 2.`);
    }
  }
  /** Tile a map from a single tile
   *
   * @param[out] map A map tiled by the input tile. All cells in the map will be initialized.
   * @param factory_y, factory_x: On a tile, the y and x coordinate a factory should be placed
   * @param tile: A filled map of a single tile. Dimensions tile_height, tile_width. All cells should already be
   * initialized, but no factories should be placed
   */
  tile_map(map: Map, factory_y, factory_x, tile: Map): void {
    // Copy the tile over the map
    for (let player_row = 0; player_row < this.num_tile_rows; ++player_row) {
        for (let player_col = 0; player_col < this.num_tile_cols; ++player_col) {
            for (let tile_row = 0; tile_row < this.tile_height; ++tile_row) {
                for (let tile_col = 0; tile_col < this.tile_width; ++tile_col) {
                  map.grid[player_row * this.tile_height + tile_row][player_col * this.tile_width + tile_col].energy = tile.grid[tile_row][tile_col].energy;
                    // map.at(player_col * this.tile_width + tile_col, player_row * this.tile_height + tile_row).energy =
                    //         tile.at(tile_col, tile_row).energy;
                }
            }
        }
    }

    // Place a factory for each player on the map at corresponding relative locations
    for (let player_idx = 0; player_idx < this.num_players; player_idx++) {
        const player_factory_x = (player_idx % this.num_tile_cols) * this.tile_width + factory_x;
        const player_factory_y = Math.floor((player_idx / this.num_tile_cols)) * this.tile_height + factory_y;
        // map.at(player_factory_x, player_factory_y).energy = 0;
        console.log(player_factory_x, player_factory_y);
        map.grid[player_factory_y][player_factory_x].energy = 0;
        map.factories.push(new Location(player_factory_x, player_factory_y))
        // map.factories.emplace_back(player_factory_x, player_factory_y);
    }
  }
}