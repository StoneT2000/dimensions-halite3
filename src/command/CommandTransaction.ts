import { EntityID } from "../model/Entity";
import { Player, PlayerID } from "../model/Player";
import { Store } from "../Store";
import { Map as GameMap } from "../model/Map";
import { DumpTransaction, ConstructTransaction, MoveTransaction, SpawnTransaction, BaseTransaction } from "./Transaction";
import { Command, MoveCommand, ConstructCommand, SpawnCommand } from "./Command";
import { Energy } from "../model/Units";
import { Constants } from "../Constants";

export enum CommandName {
  Move = 'm',
  Spawn = 'g',
  Construct = 'c'
};
const MAX_COMMANDS_PER_ENTITY = 1;
export class CommandTransaction {
  // /** Command occurrences per entity, to catch duplicates. */
  // id_map<Entity, std::pair<int, ErrorContext>> occurrences;
  occurences: Map<EntityID, {times: number, errorContext: any}> = new Map();
  // /** First command which broke occurrences requirement. */
  // id_map<Entity, std::reference_wrapper<const Command>> occurrences_first_faulty;
  occurrences_first_faulty:  Map<EntityID, Command> = new Map();
  // /** Total expenses per player. */
  // id_map<Player, std::pair<energy_type, ErrorContext>> expenses;
  expenses: Map<PlayerID, {energy: Energy, errorContext: any}> = new Map();
  // /** First command which broke expense requirement. */
  // id_map<Player, std::reference_wrapper<const Command>> expenses_first_faulty;
  expenses_first_faulty: Map<PlayerID, Command> = new Map();
  // /** Commands which break ownership requirement. */
  // id_map<Player, std::vector<std::reference_wrapper<const MoveCommand>>> move_ownership_faulty;
  move_ownership_faulty: Map<PlayerID, Array<MoveCommand>> = new Map();
  // /** Commands which break ownership requirement. */
  // id_map<Player, std::vector<std::reference_wrapper<const ConstructCommand>>> construct_ownership_faulty;
  construct_ownership_faulty: Map<PlayerID, Array<ConstructCommand>> = new Map();

  dump_transaction: DumpTransaction;           /**< The transaction for auto-dumping. */
  construct_transaction: ConstructTransaction; /**< The ConstructCommand transaction. */
  move_transaction: MoveTransaction;           /**< The MoveCommand transaction. */
  spawn_transaction: SpawnTransaction;         /**< The SpawnCommand transaction. */

  public all_transactions: Array<BaseTransaction> = [];
  constructor(public store: Store, public map: GameMap) {
    this.dump_transaction = new DumpTransaction(store, map);
    this.construct_transaction = new ConstructTransaction(store, map);
    this.move_transaction = new MoveTransaction(store, map);
    this.spawn_transaction = new SpawnTransaction(store, map);
  }
  /**
   * Check that a command operates on an entity owned by the player.
   * @param player The player.
   * @param entity The entity.
   * @param command The command.
   */
  check_ownership(player: Player, entity: EntityID, command: Command) {
    if (!player.has_entity(entity)) {
      switch (command.name) {
        // using switch to 'overload'
        case 'move':
          let arr1 = this.move_ownership_faulty.get(player.id);
          arr1.push(<MoveCommand>command);
          this.move_ownership_faulty.set(player.id, arr1);
          break;
        case 'construct':
          let arr2 = this.construct_ownership_faulty.get(player.id);
          arr2.push(<ConstructCommand>command);
          this.construct_ownership_faulty.set(player.id, arr2);
          break;
      }
      return false;
    }
    return true;
  }

  /**
   * Add a command occurrence for an entity.
   * @param entity The entity.
   * @param command The command.
   */
  add_occurrence(entity: EntityID, command: Command) {
    let occurrences_entry = this.occurences.get(entity);
    if (occurrences_entry.times == MAX_COMMANDS_PER_ENTITY) {
      // Already seen one entity, this one is illegal
      this.occurrences_first_faulty.set(entity, command);
    } else {
      // Not yet seen or already found illegal, this one is context
      // occurrences_entry.second.emplace_back(command);
    }
  }
  /**
   * Add an expense for a player.
   * @param player The player.
   * @param command The command.
   * @param amount The expense amount.
   */
  add_expense(player: Player, command: Command, amount: Energy) {
    let expenses_entry = this.expenses.get(player.id);
    let newAmount = expenses_entry.energy += amount;
    if (newAmount > player.energy) {
      // if (auto [_, inserted] = expenses_first_faulty.emplace(player.id, command); !inserted) {
      //   // This one is context
      //   // expenses_entry.second.emplace_back(command);
      // }
    } else {
      // This one is legal
      // expenses_entry.second.emplace_back(command);
    }
  }
  addCommand(player: Player, command: Command): void {
    switch(command.name) {
      case 'move':
        if (this.check_ownership(player, (<MoveCommand>command).entity, command)) {
          this.add_occurrence((<MoveCommand>command).entity, command);
          this.move_transaction.add_command(player, (<MoveCommand>command));
        }
        break;
      case 'spawn':
        this.add_expense(player, (<SpawnCommand>command), Constants.NEW_ENTITY_ENERGY_COST);
        this.spawn_transaction.add_command(player, (<SpawnCommand>command));
        break;
      case 'construct':
        if (this.check_ownership(player, (<ConstructCommand>command).entity, command)) {
          this.add_occurrence((<ConstructCommand>command).entity, command);
          let cost = Constants.DROPOFF_COST;
  
          // Cost factors in entity cargo and halite on target cell.
          const location = player.get_entity_location((<ConstructCommand>command).entity);
          const cell = this.map.atLocation(location);
          const entity = this.store.get_entity((<ConstructCommand>command).entity);
          if (cell.energy + entity.energy >= cost) {
              cost = 0;
          }
          else {
              cost -= cell.energy + entity.energy;
          }
          this.add_expense(player, (<ConstructCommand>command), cost);
  
          this.construct_transaction.add_command(player, (<ConstructCommand>command));
        }
        break;
              
    }
  }
  check(): boolean {
    let success = true;
    // // Check that player didn't try to command enemy ships
    // for (const auto &[player_id, misowned] : move_ownership_faulty) {
    //     for (const auto &faulty : misowned) {
    //         error_generated<EntityNotFoundError<MoveCommand>>(player_id, faulty);
    //     }
    //     success = false;
    // }
    // for (const auto &[player_id, misowned] : construct_ownership_faulty) {
    //     for (const auto &faulty : misowned) {
    //         error_generated<EntityNotFoundError<ConstructCommand>>(player_id, faulty);
    //     }
    //     success = false;
    // }

    // // Check that expenses are not too high
    // for (auto &[player_id, faulty] : expenses_first_faulty) {
    //     const auto &player = store.get_player(player_id);
    //     auto &[energy, context] = expenses[player_id];
    //     error_generated<PlayerInsufficientEnergyError>(player_id, faulty, context, player.energy, energy);
    //     success = false;
    // }
    // // Check that each entity is operated on at most once
    // for (auto &[entity_id, faulty] : occurrences_first_faulty) {
    //     const auto owner = store.get_entity(entity_id).owner;
    //     auto &[_, context] = occurrences[entity_id];
    //     error_generated<ExcessiveCommandsError>(owner, faulty, context, entity_id);
    //     success = false;
    // }
    // // Check that each transaction can succeed individually
    // for (BaseTransaction &transaction : all_transactions) {
    //     if (!transaction.check()) {
    //         success = false;
    //     }
    // }
    return success;
  }
  commit() {

  }
}