import fs from 'fs';
import { Location } from "../model/Location";
import { Energy } from "../model/Units";
import { Cell } from "../model/Cell";
import { Entity, EntityID } from "../model/Entity";
import { Command } from "../command/Command";
import { PlayerID, Player } from "../model/Player";
import { GameEvent } from "./GameEvent";
import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { Constants } from '../Constants';
import { GameStatistics } from "../Statistics";

export class CellInfo {
  x: number;
  y: number;
  production: Energy;
  constructor(location: Location, cell: Cell) {
    this.x = location.x;
    this.y = location.y;
    this.production = cell.energy;
  }
  to_json() {
    return {
      x: this.x,
      y: this.y,
      production: this.production
    }
  }
}
export class EntityInfo {
  x: number;
  y: number;
  energy: Energy;
  is_inspired: boolean;
  constructor(location: Location, entity: Entity) {
    this.x = location.x;
    this.y = location.y;
    this.energy = entity.energy;
    this.is_inspired = entity.is_inspired;
  }
  to_json() {
    return {
      x: this.x,
      y: this.y,
      is_inspired: this.is_inspired,
      energy: this.energy
    }
  }
}
type Entities = Map<EntityID, EntityInfo>;
export class Turn {
  /** Mapping from player id to the commands they issued this turn */
  // ordered_id_map<Player, std::vector<std::unique_ptr<Command>>> moves;
  moves: Map<PlayerID, Array<Command>> = new Map();
  // id_map<Player, energy_type> energy;  /**< Mapping from player id to the energy they ended the turn with */
  energy: Map<PlayerID, Energy> = new Map();
  // id_map<Player, energy_type> deposited; /**< Mapping from player id to the total energy they deposited by the end of turn */
  deposited: Map<PlayerID, Energy> = new Map();
  // std::vector<GameEvent> events;       /**< Events occurring this turn (spawns, deaths, etc) for replay */
  events: Array<GameEvent> = [];
  // std::vector<CellInfo> cells;         /**< Cells that changed on this turn */
  cells: Array<CellInfo> = [];
  // id_map<Player, Entities> entities{}; /**< Current entities and their information. */
  entities: Map<PlayerID, Entities> = new Map();

  to_json(turn: Turn) {
    let json = {
      events: this.events.map((event) => event.to_json()),
      cells: this.cells.map((cell) => cell.to_json())
    }
    let moves_json = {};
    let energy_json = {};
    let deposited_json = {};
    let entities_json = {};
    turn.moves.forEach((commands, player_id) => {
      moves_json[player_id] = commands.map((command) => command.to_json());
    });
    turn.energy.forEach((energy, player_id) => {
      energy_json[player_id] = energy;
    });
    turn.deposited.forEach((deposited, player_id) => {
      deposited_json[player_id] = deposited;
    });
    turn.entities.forEach((entities_map, player_id) => {
      let player_entity_json = {};
      entities_map.forEach((entity_info, entity_id) => {
        player_entity_json[entity_id] = entity_info.to_json();
      });
      entities_json[player_id] = player_entity_json;
    });
    json['moves'] = moves_json;
    json['energy'] = energy_json;
    json['deposited'] = deposited_json;
    json['entities'] = entities_json;
    return json;
  }
  /**
   * Given the game store, reformat and store entity state at start of turn in replay
   * param store The game store at the start of the turn
   */
  add_entities(store: Store): void {
    // Initialize each player to have no entities
    store.players.forEach((player, player_id) => {
      this.entities.set(player_id, new Map());
    });
    store.entities.forEach((entity, entity_id) => {
      const location = store.get_player(entity.owner).get_entity_location(entity.id);
      const entity_info: EntityInfo = new EntityInfo(location, entity);
      // entities[entity.owner].insert( {{entity.id, entity_info}} );
      let map = this.entities.get(entity.owner);
      map.set(entity_id, entity_info);
      this.entities.set(entity.owner, map);
    });
  }

  /**
   * Add cells changed on this turn to the replay file
   * @param map The game map (to access cell energy)
   * @param cells The locations of changed cells
   */
  add_cells(map: GameMap, changed_cells: Set<Location>): void {
    changed_cells.forEach((location) => {
      let cell = map.atLocation(location);
      // this->cells.emplace_back(location, cell); emplace_back is basically calling new CellInfo because cells is CellInfo[]
      this.cells.push(new CellInfo(location, cell));
    });
  }

  /**
   * Given the game store, add all state from end of turn in replay
   * param store The game store at the end of the turn
   */
  add_end_state(store: Store): void {
    store.players.forEach((player, player_id) => {
      this.energy.set(player_id, player.energy);
      this.deposited.set(player_id, player.total_energy_deposited);
    })
  }

  constructor() {

  }

}
export class Replay {
  game_statistics: GameStatistics;                            /**< Statistics for the game (inlcudes number of turns) */
  // const Constants &GAME_CONSTANTS = Constants::get();         /**< Constants used in this game */
  GAME_CONSTANTS = Constants;
  static REPLAY_FILE_VERSION = 3;     /**< Replay file version (updated as this struct or serialization changes) */
  // static constexpr auto ENGINE_VERSION = HALITE_VERSION;      /**< Version of the game engine */
  static ENGINE_VERSION = '1.1.6';      /**< Version of the game engine */

  number_of_players: number = 0;                                   /**< Number of players in this game */
  // ordered_id_map<Player, Player> players{};                   /**< List of players at start of game, including factory location and initial entities */
  players: Map<PlayerID, Player> = new Map();
  // std::vector<hlt::Turn> full_frames{};                       /**< Turn information: first element = first frame/turn. Length is game_statistics.number_turns */
  full_frames: Array<Turn> = [];

  map_generator_seed: number = 0;                            /**< Seed used in random number generator for map */
  production_map: GameMap;                                   /**< Map of cells game was played on, including factory and other cells. Struct incldues name of map generator */

  constructor(game_statistics: GameStatistics, number_of_players: number, seed: number, production_map: GameMap) {
    this.game_statistics = game_statistics;
    this.number_of_players = number_of_players;
    this.map_generator_seed = seed;
    this.production_map = production_map;
  }

  /**
   * Output replay into file. Replay will be in json format and may be compressed
   *
   * @param filename File to put replay into
   * @param enable_compression Switch to decide whether or not to compress replay file
   */
  output(filename: string, enable_compression: boolean): void {
    let json = {
      ENGINE_VERSION: Replay.ENGINE_VERSION,
      GAME_CONSTANTS: this.GAME_CONSTANTS,
      REPLAY_FILE_VERSION: Replay.REPLAY_FILE_VERSION,
      full_frames: this.full_frames,
      game_statistics: this.game_statistics.to_json(),
      map_generator_seed: this.map_generator_seed,
      number_of_players: this.number_of_players,
      players: [], 
      production_map: this.production_map.to_json()
    }
    let players_json = []
    this.players.forEach((player) => {
      players_json.push(player.to_json()) // TODO, deal with to_json for maps with tpyes that need to do a to_json
    });
    json['players'] = players_json;
    
    let data = JSON.stringify(json);
    if (enable_compression) {
      // implement using node zstd-codec
      // auto compressed_length = ZSTD_compressBound(data_size);
      // auto compressed_data = reinterpret_cast<uint8_t *>(std::malloc(compressed_length));
      // auto result = ZSTD_compress(compressed_data, compressed_length,
      //                             bin_data, data_size, ZSTD_maxCLevel());
      // if (!ZSTD_isError(result)) {
      //     gameFile.write(reinterpret_cast<const char *>(compressed_data),
      //                    result * sizeof(uint8_t));
      // } else {
      //     Logging::log("Warning: could not compress replay file! \n", Logging::Level::Warning);
      //     gameFile.write(reinterpret_cast<const char *>(data.data()), data_size);
      // }

      // std::free(compressed_data);
    } else {
        // gameFile.write(reinterpret_cast<const char *>(data.data()), data_size);
        fs.writeFileSync(filename, data);
    }    

  }
}