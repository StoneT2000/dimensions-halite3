import { PlayerID, Player } from "./model/Player";
import { EntityID, Entity, Factory } from "./model/Entity";
import { Location } from "./model/Location";
import { Energy } from "./model/Units";
import { Dropoff } from "./model/Dropoff";

/** Storage and lifetime management for Player and Entity objects. */
export class Store {
  public players: Map<PlayerID, Player> = new Map();
  public entities: Map<EntityID, Entity> = new Map();

  // TODO: ? NOT SURE WHAT TO DO WITH
  // Factory<Player> player_factory;   /**< The player factory. */
  // Factory<Entity> entity_factory;   /**< The entity factory. */
  // Factory<Dropoff> dropoff_factory; /**< The dropoff factory. */

  player_factory: Factory<Player> = new Factory<Player>(Player);
  entity_factory: Factory<Entity> = new Factory<Entity>(Entity);
  dropoff_factory: Factory<Dropoff> = new Factory<Dropoff>(Dropoff);
  // std::unordered_set<Location> changed_cells{}; /**< The cells changed on the last turn. */
  public changed_cells: Set<Location> = new Set();
  
  public changed_entities: Set<EntityID> = new Set(); // not in halite original implementation, but makes dimension design better

  public map_total_energy: number = 0;

  /**
   * Get an entity by ID.
   *
   * @param id The entity ID.
   * @return The entity.
   */
  get_player(id: PlayerID): Player | undefined {
    return this.players.get(id);
  }
  /**
   * Get an entity by ID.
   *
   * @param id The entity ID.
   * @return The entity.
   */
  get_entity(id: EntityID): Entity | undefined {
    return this.entities.get(id);
  }

   /**
   * Get an iterator over all entities.
   */
  // StoreEntityIter all_entities() { return StoreEntityIter(entities); }
  /**
   * Obtain a new entity.
   *
   * @param energy The energy of the entity.
   * @param owner The owner of the entity.
   * @return The new entity.
   */
  new_entity(energy: Energy, owner: PlayerID): Entity {
    let entity = this.entity_factory.make(owner, energy);
    this.entities.set(entity.id, entity);
    return entity;
  }
  /**
   * Obtain a new dropoff.
   * @param location The location of the dropoff.
   * @return The new dropoff.
   */
  new_dropoff(location: Location): Dropoff {
    let dropoff = this.dropoff_factory.make(location);
    return dropoff;
  }
  /**
   * Delete an entity by ID.
   *
   * @param id The ID of the entity.
   */
  delete_entity(id: EntityID): void {
    this.entities.delete(id);
  }
}