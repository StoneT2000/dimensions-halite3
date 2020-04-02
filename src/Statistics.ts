import { PlayerID, Player } from "./model/Player";
import { Energy } from "./model/Units";
import { Location } from "./model/Location";

export class PlayerStatistics {
  player_id: PlayerID;
  random_id: number = 0;
  rank: number = 0;
  last_turn_alive = 0;
  last_turn_ship_spawn = 0;
  turn_productions: Array<Energy> = [];
  total_production: Energy = 0;
  total_mined: Energy = 0;
  total_bonus: Energy = 0;
  total_mined_from_captured: Energy = 0;
  total_dropped: Energy = 0;
  carried_at_end: Energy = 0;
  max_entity_distance = 0;
  total_distance = 0;
  total_entity_lifespan = 0;
  number_dropoffs = 0;
  interaction_opportunities = 0;
  ships_captured =0;                       /**< The number of ships captured by this player. */
  ships_given = 0;                         /**< The number of ships captured from this player. */
  self_collisions = 0;                     /**< The number of ships involved in collisions with allied ships. */
  all_collisions = 0;                      /**< The number of ships involved in collisions with any ships, allied or not. Note there may be overlap with self_collisions if a 3+ ship collision occurs. */
  dropoff_collisions = 0;                  /**< The number of ships involved in collisions with allied ships over a friendly dropoff. */
  ships_spawned = 0;                       /**< The number of ships spawned. */
  ships_peak = 0;

  halite_per_dropoff: Map<Location, Energy> = new Map();

  constructor(player_id: PlayerID, random_id: number) {
    this.player_id = player_id;
    this.random_id = random_id;
  }

  to_json(stats: PlayerStatistics) {
    let average_distance = 0;
    if (stats.total_entity_lifespan != 0) {
        average_distance = stats.total_distance / stats.total_entity_lifespan;
    }
    let final_production: Energy = 0;
    if (stats.turn_productions.length) {
        final_production = stats.turn_productions[stats.turn_productions.length - 1];
    }
    let mining_efficiency = 0.0;

    if (stats.total_mined > 0) {
        mining_efficiency = stats.total_production / (stats.total_mined);
    }
    let json = {
      player_id: this.player_id,
      random_id: this.random_id,
      rank: this.rank,
      last_turn_alive: this.last_turn_alive,
      last_turn_ship_spawn: this.last_turn_ship_spawn,
      final_production: final_production,
      total_production: this.total_production,
      max_entity_distance: this.max_entity_distance,
      number_dropoffs: this.number_dropoffs,
      interaction_opportunities: this.interaction_opportunities,
      //ships_captured: this.,
      //ships_given: this.,
      ships_spawned: this.ships_spawned,
      ships_peak: this.ships_peak,
      self_collisions: this.self_collisions,
      all_collisions: this.all_collisions,
      dropoff_collisions: this.dropoff_collisions,
      total_mined: this.total_mined,
      total_bonus: this.total_bonus,
      //total_mined_from_captured: this.,
      total_dropped: this.total_dropped,
      carried_at_end: this.carried_at_end,
      mining_efficiency: mining_efficiency,
      halite_per_dropoff: this.halite_per_dropoff,
      average_entity_distance: average_distance,
    }
    return JSON.stringify(json);
  }

}

export class GameStatistics {
  player_statistics: Array<PlayerStatistics> = [];
  number_turns = 0;
  map_total_halite: Energy = 0;                        /**< Total halite available at the start. */
  execution_time = 0;                            /**< Execution time of the game in ms. */

  turn_number = 0;
  to_json(stats: GameStatistics) {
    return JSON.stringify({
      number_turns: this.number_turns,
      player_statistics: this.player_statistics,
      execution_time: this.execution_time,
      map_total_halite: this.map_total_halite
    })
  }
}