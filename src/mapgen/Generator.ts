import { Map } from "../model/Map";
import { Location } from "../model/Location";

export class Generator {
  static generateBasic(map: Map, numPlayers: number) {

    let factory_x = 12;
    let factory_y = 12;
    // init with 100 energy each
    for (let y = 0; y < map.width; y++) {
      for (let x = 0; x < map.height; x++) {
        map.grid[y][x].energy = 400;
      }
    }
    // place factory for each plaeyr
    //   for (unsigned long player_idx = 0; player_idx < num_players; player_idx++) {
    //     const dimension_type player_factory_x = (player_idx % num_tile_cols) * tile_width + factory_x;
    //     const dimension_type player_factory_y = (player_idx / num_tile_cols) * tile_height + factory_y;
    //     map.at(player_factory_x, player_factory_y).energy = 0;

    //     map.factories.emplace_back(player_factory_x, player_factory_y);
    // }

    // constant places
    for (let i = 0; i < numPlayers; i++) {
      let player_factory_x = (i * 6) % map.width;
      let player_factory_y = (i * 6) % map.height;
      map.factories.push(new Location(player_factory_x, player_factory_y));
    }
  }
}