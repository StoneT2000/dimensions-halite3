import { GeneratorBase, MapParameters } from "./GeneratorBase";
import { Logger, FatalError } from "dimensions-ai";
import { Map } from "../model/Map";
import { Location } from "../model/Location";

export class SymmetricalTile extends GeneratorBase {
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

    let allowed_numbers = [1,2,4,8,16];
    let found = false;
    for (let i = 0; i < allowed_numbers.length; i++) {
      if (allowed_numbers[i] == this.num_players) {
        found = true;
        break;
      }
    }
    if (!found) {
      throw new FatalError(`We cannot create a game map for the specified number of players ${this.num_players}). Please try playing with 1, 2, 4, 8, or 16 players`);
    }
    let num_tiles = 1;
    this.num_tile_rows = 1;
    this.num_tile_cols = 1;

    while (num_tiles < this.num_players) {
      // Flips will happen across y axis, then x axis, repeatedly
      this.num_tile_cols *= 2;
      num_tiles *= 2;
      if (num_tiles == this.num_players) break;
      this.num_tile_rows *=2;
      num_tiles *= 2;
    }

    // next, use number of rows and cols of player start tiles to determine height and width of a single tile
    this.tile_width = Math.floor(this.width / this.num_tile_cols);
    this.tile_height = Math.floor(this.height / this.num_tile_rows);

    // Ensure these tiles then make up the whole map
    if (!(this.tile_width * this.num_tile_cols == this.width && this.tile_height * this.num_tile_rows == this.height)) {
        // std::ostringstream stream;
        // stream << "We cannot create a symmetrical map of dimensions " << width << " x " << height << " for " << num_players;
        // stream << " players. Try using dimensions that are a power of 2 instead.";
        // Logging::log(stream.str(), Logging::Level::Error);
        throw new FatalError(`We cannot create a symmetrical map of dimensions ${this.width} x ${this.height} for ${this.num_players} players. Try using dimensions that are a power of 2 instead.`);
    }

  }
  flip_vertical(map: Map, tile_width, tile_height) {
    // Reflect filled in part of map over y axis
    for (let tile_row = 0; tile_row < tile_height; ++tile_row) {
      for (let tile_col = 0; tile_col < tile_width; ++tile_col) {
        map.at(tile_width * 2 - tile_col - 1, tile_row).energy = map.at(tile_col, tile_row).energy;
      }
    }

    // add reflections of current factories
    let factory_locations: Array<Location> = map.factories;
    factory_locations.forEach((factory) => {
      const flipped_factory: Location = new Location(tile_width * 2 - factory.x - 1, factory.y);
      map.atLocation(flipped_factory).energy = 0;
      map.factories.push(flipped_factory);
    });
  }

  flip_horizontal(map: Map, tile_width, tile_height) {
    // Reflect filled in part of map over y axis
    for (let tile_row = 0; tile_row < tile_height; ++tile_row) {
      for (let tile_col = 0; tile_col < tile_width; ++tile_col) {
        map.at(tile_col, tile_height * 2 - tile_row - 1).energy = map.at(tile_col, tile_row).energy;
      }
    }

    // add reflections of current factories
    let factory_locations: Array<Location> = map.factories;
    factory_locations.forEach((factory) => {
      const flipped_factory: Location = new Location(factory.x, tile_height * 2 - factory.y - 1);
      map.atLocation(flipped_factory).energy = 0;
      map.factories.push(flipped_factory);
    });
  }

  tile_map(map: Map, factory_y, factory_x, tile: Map) {
    let factory_pos_x = Math.floor(tile.width / 2);
    let factory_pos_y = Math.floor(tile.height / 2);
    if (tile.width >= 16 && tile.width <= 40 && tile.height >= 16 && tile.height <= 40) {
        factory_pos_x = Math.floor(8 + ((tile.width - 16) / 24.0) * 20);
        if (this.num_players > 2) {
            factory_pos_y = Math.floor(8 + ((tile.height - 16) / 24.0) * 20);
        }
    }
    // (void) factory_y, (void) factory_x;

    // copy tile and factory onto map
    for (let tile_row = 0; tile_row < this.tile_height; ++tile_row) {
        for (let tile_col = 0; tile_col < this.tile_width; ++tile_col) {
            map.at(tile_col, tile_row).energy = tile.at(tile_col, tile_row).energy;
        }
    }

    const factory = new Location(factory_pos_x, factory_pos_y);
    map.atLocation(factory).energy = 0;
    map.factories.push(factory);

    let num_tiles = 1;
    let curr_width = this.tile_width;
    let curr_height = this.tile_height;
    while (num_tiles < this.num_players) {
        // Flips will happen across y axis, then x axis, repeatedly, until whole map filled in
        this.flip_vertical(map, curr_width, curr_height);
        curr_width *= 2;
        num_tiles *= 2;
        if (num_tiles == this.num_players) break;
        this.flip_horizontal(map, curr_width, curr_height);
        curr_height *=2;
        num_tiles *= 2;
    }
  }
}