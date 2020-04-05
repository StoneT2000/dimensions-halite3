import { Map } from "../model/Map";
import { Location } from "../model/Location";
import MersenneTwister from 'mersenne-twister';
import { BlurTileGenerator } from "./BlurTileGenerator";

export enum MapType {
  Basic = 'basic',
  BlurTile = 'blur',
  Fractal = 'fractal'
}

export type MapParameters = {
  type: MapType,
  seed: number,
  width: number,
  height: number,
  numPlayers: number
}
export abstract class GeneratorBase {
  public rng: MersenneTwister
  constructor(parameters: MapParameters) {
    this.rng = new MersenneTwister(parameters.seed);
    // call this first before using it. This is because halite uses the mersenne twister once at main.cpp, but we have two instances of the mersenne twister, here and in the design
    this.rng.random_int();
  }

  static generateBasic(map: Map, numPlayers: number) {

    let factory_x = 4;
    let factory_y = 4;
    // init with 100 energy each
    for (let y = 0; y < map.width; y++) {
      for (let x = 0; x < map.height; x++) {
        map.grid[y][x].energy = 400;
      }
    }
    let num_tile_cols = 8;
    let tile_width = 4;
    let tile_height = 4;
    // place factory for each plaeyr
    for (let player_id = 0; player_id < numPlayers; player_id++) {
      let p_f_x = (player_id % num_tile_cols) * tile_width + factory_x;
      let p_f_y = (player_id % num_tile_cols) * tile_height + factory_y;
      map.at(p_f_x, p_f_y).energy = 0;
      map.factories.push(new Location(p_f_x, p_f_y));
    }
    //   for (unsigned long player_idx = 0; player_idx < num_players; player_idx++) {
    //     const dimension_type player_factory_x = (player_idx % num_tile_cols) * tile_width + factory_x;
    //     const dimension_type player_factory_y = (player_idx / num_tile_cols) * tile_height + factory_y;
    //     map.at(player_factory_x, player_factory_y).energy = 0;

    //     map.factories.emplace_back(player_factory_x, player_factory_y);
    // }

    // constant places
    // for (let i = 0; i < numPlayers; i++) {
    //   let player_factory_x = (i * 6) % map.width;
    //   let player_factory_y = (i * 6) % map.height;
    //   map.factories.push(new Location(player_factory_x, player_factory_y));
    // }
  }
}