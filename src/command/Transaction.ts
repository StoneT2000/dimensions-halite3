import { PlayerID, Player } from "../model/Player";
import { Command } from "./Command";
import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { Entity, EntityID } from "../model/Entity";
import { Location } from "../model/Location";
import { Cell } from "../model/Cell";
import { Energy } from "../model/Units";
import { Dropoff } from "../model/Dropoff";

abstract class BaseTransaction {
  // commit the transaction / perform it and update state
  abstract commit(): void;

  // check if we are allowed to use this transaction containing a command
  abstract check(): boolean;

  commands: Map<PlayerID, Array<Command>> = new Map();
  /**
   * Add a command to the transaction.
   * @param player The player executing the command.
   * @param command The command to be executed.
   */
  add_command(player: Player, command: Command): void {
    let l = this.commands.get(player.id);
    l.push(command);
    this.commands.set(player.id, l);
  }
  constructor(public store: Store, public map: GameMap) {

  }
}
export class MoveTransaction extends BaseTransaction {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    let success = true;
    // for (const auto &[player_id, moves] : commands) {
    //     auto &player = store.get_player(player_id);
    //     for (const MoveCommand &command : moves) {
    //         // Entity is not valid
    //         if (!player.has_entity(command.entity)) {
    //             error_generated<EntityNotFoundError<MoveCommand>>(player_id, command);
    //             success = false;
    //         }
    //     }
    // }
    return success;
  }
  commit() {

  }
}
export class SpawnTransaction extends BaseTransaction {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    return true;
  }
  commit() {
    
  }
}
export class ConstructTransaction extends BaseTransaction {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    return true;
  }
  commit() {
    
  }
}
export class DumpTransaction extends BaseTransaction {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check(): boolean {
    return true;
  }
  commit() {
    // If an entity ends the turn on their dropoff or shipyard,
    // auto-dump all their energy.
    this.store.entities.forEach((entity: Entity, entity_id: EntityID) => {
      const player = this.store.get_player(entity.owner);
      const location = player.get_entity_location(entity.id);
      let cell = this.map.atLocation(location);
      if (cell.owner == entity.owner) {
        dump_energy(this.store, entity, location, cell, entity.energy);
      }
    })
  }
}


/**
 * Dump energy onto a cell.
 *
 * @param store The game store.
 * @param location The location at which to dump.
 * @param cell The cell at which to dump.
 * @param energy The dumped amount of energy.
 */
function dump_energy2(store: Store, location: Location, cell: Cell, energy: Energy) {
  if (cell.owner == null) {
    // Just dump directly onto the cell.
    cell.energy += energy;
    store.map_total_energy += energy;
  } else {
    // The cell owner gets all the energy
    let player = store.get_player(cell.owner);
    player.energy += energy;

    // Track how much energy is deposited in each dropoff
    player.total_energy_deposited += energy;
    if (location == player.factory) {
      player.factory_energy_deposited += energy;
    }
    else {
      player.dropoffs.forEach((dropoff: Dropoff) => {
        if (dropoff.location == location) {
          dropoff.deposited_halite += energy;
          return;
        }
      });
    }
  }
}

function dump_energy(store: Store, entity: Entity, location: Location, cell: Cell, energy: Energy) {
 // Decrease the entity's energy.
 entity.energy -= energy;
 dump_energy2(store, location, cell, energy);
}