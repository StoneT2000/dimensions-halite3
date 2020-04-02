import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { GameStatistics } from "../Statistics";
import { Energy } from "../model/Units";
import { PlayerID } from "../model/Player";
import { EntityID } from "../model/Entity";
import { Location } from "../model/Location";
export type GameEvent = BaseEvent;
export abstract class BaseEvent {
  location: Location;
  abstract to_json(): any;
  abstract update_stats(store: Store, map: GameMap, stats: GameStatistics); 
  constructor(location: Location) {
    this.location = location;
  }
}

const JSON_TYPE_KEY = "type";
export class SpawnEvent extends BaseEvent {
  energy: Energy = 0;
  owner_id: PlayerID = 0;
  id: EntityID = 0;
  static GAME_EVENT_TYPE_NAME = "spawn";
  constructor(location: Location, energy: Energy, owner_id: PlayerID, id: EntityID) {
    super(location);
    this.energy = energy;
    this.owner_id = owner_id;
    this.id = id;
  }
  update_stats(store: Store, map: GameMap, stats: GameStatistics) {

    // stats.player_statistics.at(owner_id.value).ships_spawned++;
    stats.player_statistics[this.owner_id].ships_spawned++;
    // stats.player_statistics.at(owner_id.value).last_turn_ship_spawn = stats.turn_number;
    stats.player_statistics[this.owner_id].last_turn_ship_spawn = stats.turn_number;
  }
  to_json() {
    return {
      type: SpawnEvent.GAME_EVENT_TYPE_NAME,
      location: this.location.to_json(),
      owner_id: <number>this.owner_id,
      id: <number>this.id,
      energy: this.energy
    };
  };
}

// not used
export class CaptureEvent extends BaseEvent {
  old_owner;                              /**< ID of player giving entity */
  old_id;                                 /**< ID of lost entity */
  new_owner;                              /**< ID of player receiving entity */
  new_id;                                 /**< ID of gained entity */
  static GAME_EVENT_TYPE_NAME = "capture"; /**< Name of event */
  constructor(location: Location, old_owner: PlayerID, old_id: EntityID, new_owner: PlayerID, new_id: EntityID) {
    super(location);
    this.old_owner = old_owner;
    this.old_id = old_id;
    this.new_owner = new_owner;
    this.new_id = new_id;
  }
  update_stats(store: Store, map: GameMap, stats: GameStatistics) {

  }
  to_json() {
    return {
      type: CaptureEvent.GAME_EVENT_TYPE_NAME,
      location: this.location.to_json(),
      old_owner: <number>this.old_owner,
      new_owner: <number>this.new_owner,
      old_id: <number>this.old_id,
      new_id: <number>this.new_id
    };
  };
}

export class CollisionEvent extends BaseEvent {
  ships: Array<EntityID> = [];   /**< ids of entities involved in the collision */
  static GAME_EVENT_TYPE_NAME = "shipwreck"; /**< Name of event */

  constructor(location: Location, ships: Array<EntityID>) {
    super(location);
    this.ships = ships;
  }  
  update_stats(store: Store, map: GameMap, stats: GameStatistics) {
    // (void) map; casts harmless reference, no use

    // ordered_id_map<Player, int> ships_involved;
    let ships_involved: Map<PlayerID, number> = new Map();
    this.ships.forEach((ship_id) => {
      let entity = store.get_entity(ship_id);
      let player_stats = stats.player_statistics[entity.owner];

      let oldval = 0;
      if (ships_involved.has(entity.owner)) { oldval = ships_involved.get(entity.owner) };
      ships_involved.set(entity.owner, oldval + 1);
      player_stats.all_collisions++;

      if (map.atLocation(this.location).owner == entity.owner) { // There is a friendly dropoff
        player_stats.dropoff_collisions++;
      } else {
        // it only counts as dropped if it's not going into a friendly dropoff
        player_stats.total_dropped += entity.energy;
      }
    })
    ships_involved.forEach((num_ships, player_id) => {
      // Increment self-collision to account for uncounted ship
      if (num_ships > 1) {
        stats.player_statistics[player_id].self_collisions += num_ships;
      }
    });
  }
  to_json() {
    return {
      type: CollisionEvent.GAME_EVENT_TYPE_NAME,
      location: this.location.to_json(),
      ships: <Array<number>>this.ships
    };
  };
}

export class ConstructionEvent extends BaseEvent {
  owner_id: PlayerID;
  id: EntityID;
  static GAME_EVENT_TYPE_NAME = "construct";

  constructor(location: Location, owner_id: PlayerID, id: EntityID) {
    super(location);
    this.owner_id = owner_id;
    this.id = id;
  }
  update_stats(store: Store, map: GameMap, stats: GameStatistics) {
    // nothing is supposed to happen
  }
  to_json() {
    return {
      type: ConstructionEvent.GAME_EVENT_TYPE_NAME,
      location: this.location.to_json(),
      owner_id: <number>this.owner_id,
      id: <number>this.id
    };
  };
}