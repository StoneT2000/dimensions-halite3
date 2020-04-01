import { PlayerID, Player } from "../model/Player";
import { Command, MoveCommand, SpawnCommand, ConstructCommand, NoCommand } from "./Command";
import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { Entity, EntityID } from "../model/Entity";
import { Location } from "../model/Location";
import { Cell } from "../model/Cell";
import { Energy } from "../model/Units";
import { Dropoff } from "../model/Dropoff";
import { constants } from "../constants";

abstract class Transaction<CommandType> {
  // commit the transaction / perform it and update state
  abstract commit(): void;

  // check if we are allowed to use this transaction containing a command
  abstract check(): boolean;

  commands: Map<PlayerID, Array<CommandType>> = new Map();
  /**
   * Add a command to the transaction.
   * @param player The player executing the command.
   * @param command The command to be executed.
   */
  add_command(player: Player, command: CommandType): void {
    // put a command in the end of the corresponding commandtype array for a player
    let l = this.commands.get(player.id);
    l.push(command);
    this.commands.set(player.id, l);
  }
  constructor(public store: Store, public map: GameMap) {

  }
  cell_updated(location: Location) {
    this.store.changed_cells.add(location);
  }
  entity_updated(entity_id: EntityID) {
    this.store.changed_entities.add(entity_id);
  }

}
export class MoveTransaction extends Transaction<MoveCommand> {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    let success = true;
    for (let i = 0; i < this.commands.length; i++) {
      let command: MoveCommand = this.commands[i];

    }
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
export class SpawnTransaction extends Transaction<SpawnCommand> {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    return true;
  }
  commit() {
    
  }
}
export class ConstructTransaction extends Transaction<ConstructCommand> {
  constructor(store: Store, map: GameMap) {
    super(store, map);
  }
  check() {
    let success = true;
    this.commands.forEach((constructs, player_id) => {
      let player = this.store.get_player(player_id);
      constructs.forEach((command) => {
        if (!player.has_entity(command.entity)) {
          // not valid entity, cant construct
          //error_generated<EntityNotFoundError<ConstructCommand>>(player_id, command);
          success = false;
        }
        else {
          let location = player.get_entity_location(command.entity);
          let cell = this.map.atLocation(location);
          if (cell.owner != null) {
            // cell is already owned
            //error_generated<CellOwnedError<ConstructCommand>>(player_id, command, location, cell.owner);
            success = false;
          }
        }
      });
    })
    return success;
  }
  commit() {
    const cost = constants.DROPOFF_COST;
    this.commands.forEach((constructs, player_id) => {
      let player = this.store.get_player(player_id);
      constructs.forEach((command) => {
        const entity_id = command.entity;
        const entity = this.store.get_entity(entity_id);
        const location = player.get_entity_location(entity_id);
        let cell = map.atLocation(location);

        // Mark as owned, clear contents of cell
        cell.owned = player;
        player.dropoffs.push(this.store.new_dropoff(location));
        this.store.map_total_energy -= cell.energy;

        // Cost is reduced by cargo + halite on cell
        const credit = cell.energy + entity.energy;

        cell.energy = 0;
        cell.entity = null;
        // event_generated<ConstructionEvent>(location, player_id, command.entity);
        this.cell_updated(location);

        // Use dump_halite for stats tracking
        dump_energy2(this.store, location, cell, credit);
        // Charge player
        player.energy -= cost;

        player.remove_entity(entity_id);
        this.store.delete_entity(entity_id);

      });
    });
  }
}
export class DumpTransaction extends Transaction<NoCommand> {
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
        this.cell_updated(location);
        this.entity_updated(entity.id);
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