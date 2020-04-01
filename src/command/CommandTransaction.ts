import { EntityID } from "../model/Entity";
import { Player } from "../model/Player";
import { Store } from "../Store";
import { Map } from "../model/Map";
import { DumpTransaction, ConstructTransaction, MoveTransaction, SpawnTransaction } from "./Transaction";

export enum CommandName {
  Move = 'm',
  Spawn = 'g',
  Construct = 'c'
};

export class CommandTransaction {
  // /** Command occurrences per entity, to catch duplicates. */
  // id_map<Entity, std::pair<int, ErrorContext>> occurrences;
  // /** First command which broke occurrences requirement. */
  // id_map<Entity, std::reference_wrapper<const Command>> occurrences_first_faulty;
  // /** Total expenses per player. */
  // id_map<Player, std::pair<energy_type, ErrorContext>> expenses;
  // /** First command which broke expense requirement. */
  // id_map<Player, std::reference_wrapper<const Command>> expenses_first_faulty;
  // /** Commands which break ownership requirement. */
  // id_map<Player, std::vector<std::reference_wrapper<const MoveCommand>>> move_ownership_faulty;
  // /** Commands which break ownership requirement. */
  // id_map<Player, std::vector<std::reference_wrapper<const ConstructCommand>>> construct_ownership_faulty;
  dump_transaction: DumpTransaction;           /**< The transaction for auto-dumping. */
  construct_transaction: ConstructTransaction; /**< The ConstructCommand transaction. */
  move_transaction: MoveTransaction;           /**< The MoveCommand transaction. */
  spawn_transaction: SpawnTransaction;         /**< The SpawnCommand transaction. */
  constructor(public store: Store, public map: Map) {
    this.dump_transaction = new DumpTransaction(store, map);
    this.construct_transaction = new ConstructTransaction(store, map);
    this.move_transaction = new MoveTransaction(store, map);
    this.spawn_transaction = new SpawnTransaction(store, map);
  }
  check_ownership(player: Player, entity: EntityID) {
    if (!player.has_entity(entity)) {
      return false;
    }
    return true;
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