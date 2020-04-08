import { PlayerID, Player } from "../model/Player";
import { Command, MoveCommand, SpawnCommand, ConstructCommand, NoCommand } from "./Command";
import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { Entity, EntityID } from "../model/Entity";
import { Location, Direction } from "../model/Location";
import { Cell } from "../model/Cell";
import { Energy } from "../model/Units";
import { Dropoff } from "../model/Dropoff";
import { Constants } from "../Constants";
import { Match, MatchWarn } from "dimensions-ai";
import { GameEvent, ConstructionEvent, CollisionEvent, SpawnEvent } from "../replay/GameEvent";

export abstract class BaseTransaction {
  // commit the transaction / perform it and update state
  abstract commit(): void;
  commands: any;
  // check if we are allowed to use this transaction containing a command
  abstract check(): boolean;
  constructor(public store: Store, public map: GameMap, public event_callback: Function) {

  }
  /**
   * Process a given event created. Halite creates events in here, isntead we create it before we call this
   * @param event 
   */
  event_generated(event: GameEvent) {
    this.event_callback(event);
  }
}
abstract class Transaction<CommandType> extends BaseTransaction {
 

  commands: Map<PlayerID, Array<CommandType>> = new Map();
  /**
   * Add a command to the transaction.
   * @param player The player executing the command.
   * @param command The command to be executed.
   */
  public add_command(player: Player, command: CommandType): void {
    // put a command in the end of the corresponding commandtype array for a player
    let l = this.commands.get(player.id);
    l.push(command);
    this.commands.set(player.id, l);
  }
  constructor(public store: Store, public map: GameMap, public match: Match, event_callback: Function) {
    super(store, map, event_callback);
    this.store.players.forEach((player) => {
      this.commands.set(player.id, []);
    })
  }
  cell_updated(location: Location) {
    this.store.changed_cells.add(location);
  }
  entity_updated(entity_id: EntityID) {
    this.store.changed_entities.add(entity_id);
  }

}
export class MoveTransaction extends Transaction<MoveCommand> {
  constructor(store: Store, map: GameMap, match: Match, event_callback: Function) {
    super(store, map, match, event_callback);
  }
  check() {
    let success = true;
    this.commands.forEach((moves, player_id) => {
      let player = this.store.get_player(player_id);
      moves.forEach((command) => {
        // Entity is not valid
        if (!player.has_entity(command.entity)) {
          // error_generated<EntityNotFoundError<MoveCommand>>(player_id, command);
          this.match.log.warn(`Player ${player_id} - Entity: ${command.entity} not found`);
          success = false;
        }
      });
    });
    return success;
  }
  commit() {
    // Map from destination location to all the entities that want to go there.
    let destinations: Map<Location, Array<EntityID>> = new Map();
    /** Map from entity to the command that caused it to move. */
    let causes: Map<EntityID, MoveCommand> = new Map();
    // Lift each entity that is moving from the grid.
    this.commands.forEach((moves, player_id) => {
      let player = this.store.get_player(player_id);
      for (let i = 0; i < moves.length; i++) {
        let command = moves[i];
        // If entity remained still, treat it as a no-op command.
        if (command.direction == Direction.Still) {
          continue;
        }
        const location = player.get_entity_location(command.entity); // note, for some reason this location is referencing the same memeory as player.factory
        let source = this.map.atLocation(location);
        let entity = this.store.get_entity(command.entity);

        // Check if entity has enough energy
        const cost = entity.is_inspired ?
            Constants.INSPIRED_MOVE_COST_RATIO :
            Constants.MOVE_COST_RATIO;
        let required: Energy = Math.floor(source.energy / cost);

        if (entity.energy < required) {
          // Entity does not have enough energy, ignore command.
          // error_generated<InsufficientEnergyError<MoveCommand>>(player_id, command, entity.energy,
          //                                                       required, !Constants::get().STRICT_ERRORS);
          // this.match.log.warn(`Player ${player_id} - Entity: ${entity.id} does not have enough energy`);
          this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Entity: ${entity.id} does not have enough energy`));
          continue;
        }
        causes.set(command.entity, command);
        // Decrease the entity's energy.
        entity.energy -= required;
        // Remove the entity from its source.
        source.entity = null;


        // this.map.move_location(location, command.direction); instead we do
        let destLoc = new Location(location.x, location.y);
        this.map.move_location(destLoc, command.direction);

        // Mark it as interested in the destination.
        let arr = [];
        if (destinations.has(location)) {arr = destinations.get(destLoc);}
        arr.push(command.entity);
        destinations.set(destLoc, arr);
        // Take it from its owner.
        // Do not mark the entity as removed in the game yet.
        this.store.get_player(entity.owner).remove_entity(command.entity);
      }
    });
    // If there are already unmoving entities at the destination, lift them off too.
    destinations.forEach((_, destination) => {
      let cell = this.map.atLocation(destination);
      if (cell.entity != null) {
        let arr = destinations.get(destination);
        arr.push(cell.entity);
        destinations.set(destination, arr);
        this.store.get_player(this.store.get_entity(cell.entity).owner).remove_entity(cell.entity);
        cell.entity = null;
      }
    });
    // If only one entity is interested in a destination, place it there.
    // Otherwise, destroy all interested entities.
    const MAX_ENTITIES_PER_CELL = 1;
    destinations.forEach((entities, destination) => {
      let cell = this.map.atLocation(destination);
      if (entities.length > MAX_ENTITIES_PER_CELL) {
        // Destroy all interested entities and collect them in replay info
        let collision_ids: Array<EntityID> = [];
        let self_collisions: Map<PlayerID, Array<EntityID>> = new Map();
        let self_collision_commands: Map<PlayerID, Array<MoveCommand>> = new Map();
        entities.forEach((entity_id) => {
          let entity = this.store.get_entity(entity_id);
          collision_ids.push(entity_id);

          // self_collisions[entity.owner].emplace_back(entity_id); vvv is js version
          let arr1 = [];
          if (self_collisions.has(entity.owner)) {arr1 = self_collisions.get(entity.owner);}
          arr1.push(entity_id);
          self_collisions.set(entity.owner, arr1);

          if (causes.has(entity_id)) {
            let cause = causes.get(entity_id);
            // self_collision_commands[entity.owner].emplace_back(cause->second); vvv is js version
            let arr2 = [];
            if (self_collision_commands.has(entity.owner)) {arr2 = self_collision_commands.get(entity.owner);}
            arr2.push(cause);
            self_collision_commands.set(entity.owner, arr2);
          }
          // Don't delete entities/dump energy until after
          // generating the event, so that HaliteImpl has a
          // chance to collect statistics.
          
        });
        self_collisions.forEach((self_collision_entities, player_id) => {
          if (self_collision_entities.length > MAX_ENTITIES_PER_CELL) {
            let commands = self_collision_commands.get(player_id);
            let first = commands.shift();
            // const ErrorContext context{commands.begin(), commands.end()};
            // error_generated<SelfCollisionError<MoveCommand>>(player_id, first, context, destination,
            //                                                   self_collision_entities,
            //                                                   !Constants::get().STRICT_ERRORS);
            this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Entities ${self_collision_entities} self collided at ${destination.toString()}`));
          }
        })
        // When generating the event, HaliteImpl will record
        // statistics.
        this.event_generated(new CollisionEvent(destination, collision_ids));
        // Now we can delete the entities.
        collision_ids.forEach((entity_id) => {
          let entity = this.store.get_entity(entity_id);
          // Dump the energy.
          dump_energy(this.store, entity, destination, cell, entity.energy);
          this.store.delete_entity(entity_id);
        })

        this.cell_updated(destination);
      } else {
        let entity_id = entities[0];
        // Place it on the map.
        cell.entity = entity_id;
        // Give it back to the owner.
        this.store.get_player(this.store.get_entity(entity_id).owner).add_entity(entity_id, destination);
        this.entity_updated(entity_id);
      }
    });
  }
  
}
export class SpawnTransaction extends Transaction<SpawnCommand> {
  constructor(store: Store, map: GameMap, match: Match, event_callback: Function) {
    super(store, map, match, event_callback);
  }
  check() {
    let success = true;
    // Only one spawn per turn
    let occurences: Set<PlayerID> = new Set();
    // std::unordered_set<Player::id_type> occurrences; ^^^
    const MAX_SPAWNS_PER_TURN = 1;
    this.commands.forEach((spawns, player_id) => {
      if (spawns.length > MAX_SPAWNS_PER_TURN) {
        success = false;
        let spawns_deque = spawns;
        // First spawn is legal
        const legal: Command = spawns_deque.shift();
        // Second is illegal
        const illegal: Command = spawns_deque.shift();
        // Remainder are in context
        // ErrorContext context;
        // context.push_back(legal);
        // for (const Command &spawn : spawns_deque) {
        //     context.push_back(spawn);
        // }
        // error_generated<ExcessiveSpawnsError>(player_id, illegal, context);
        this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Tried to spawn too many ships`));
      }
    });
    return success;
  }
  commit() {
    const constants = Constants;
    let cost = constants.NEW_ENTITY_ENERGY_COST;
    this.commands.forEach((spawns, player_id) => {
      spawns.forEach((spawn) => {
        let player = this.store.get_player(player_id);
        player.energy -= cost;
        let cell = this.map.atLocation(player.factory);

        let entity = this.store.new_entity(0, player.id);
        player.add_entity(entity.id, player.factory);
        this.entity_updated(entity.id);
        // event_generated<SpawnEvent>(player.factory, 0, player.id, entity.id);
        this.event_generated(new SpawnEvent(player.factory, 0, player.id, entity.id));

        if (cell.entity == null) {
          cell.entity = entity.id;
        } else {
          // There is a collision, collide with the existing.
          let existing_entity = this.store.get_entity(cell.entity);
          let existing_player = this.store.get_player(existing_entity.owner);
          let owner = this.store.get_player(cell.owner);

          if (existing_entity.owner == cell.owner) {
              // error_generated<SelfCollisionError<SpawnCommand>>(player_id, spawn, ErrorContext(), player.factory,
              //                                                   std::vector<Entity::id_type>{cell.entity, entity.id},
              //                                                   !Constants::get().STRICT_ERRORS);
              this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Entities ${entity.id} self collided with ${cell.entity} at player factory: (${player.factory.toString()})`));
          }
          // event_generated<CollisionEvent>(owner.factory, std::vector<Entity::id_type>{cell.entity, entity.id});
          this.event_generated(new CollisionEvent(owner.factory, [cell.entity, entity.id]))

          // Use dump_energy in case the collision was from a
          // different player.
          dump_energy(this.store, existing_entity, owner.factory, cell, existing_entity.energy);
          existing_player.remove_entity(cell.entity);
          this.store.delete_entity(cell.entity);
          player.remove_entity(entity.id);
          this.store.delete_entity(entity.id);
          cell.entity = null;
        }
      });
    });
  }
}
export class ConstructTransaction extends Transaction<ConstructCommand> {
  constructor(store: Store, map: GameMap, match: Match, event_callback: Function) {
    super(store, map, match, event_callback);
  }
  check() {
    let success = true;
    this.commands.forEach((constructs, player_id) => {
      let player = this.store.get_player(player_id);
      constructs.forEach((command) => {
        if (!player.has_entity(command.entity)) {
          // not valid entity, cant construct
          //error_generated<EntityNotFoundError<ConstructCommand>>(player_id, command);
          this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Can't construct with unowned/unkown entity ${command.entity}`));
          success = false;
        }
        else {
          let location = player.get_entity_location(command.entity);
          let cell = this.map.atLocation(location);
          if (cell.owner != null) {
            // cell is already owned
            //error_generated<CellOwnedError<ConstructCommand>>(player_id, command, location, cell.owner);
            this.match.throw(player_id, new MatchWarn(`Player ${player_id} - Can't construct on cell ${location.toString()} owned by ${cell.owner}`));
            success = false;
          }
        }
      });
    })
    return success;
  }
  commit() {
    const cost = Constants.DROPOFF_COST;
    this.commands.forEach((constructs, player_id) => {
      let player = this.store.get_player(player_id);
      constructs.forEach((command) => {
        const entity_id = command.entity;
        const entity = this.store.get_entity(entity_id);
        const location = player.get_entity_location(entity_id);
        let cell = this.map.atLocation(location);

        // Mark as owned, clear contents of cell
        cell.owner = player_id;
        player.dropoffs.push(this.store.new_dropoff(location));
        this.store.map_total_energy -= cell.energy;

        // Cost is reduced by cargo + halite on cell
        const credit = cell.energy + entity.energy;

        cell.energy = 0;
        cell.entity = null;
        this.event_generated(new ConstructionEvent(location, player_id, command.entity));
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
  constructor(store: Store, map: GameMap, match: Match, event_callback: Function) {
    super(store, map, match, event_callback);
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