import { class_id, Enumerated, ID_Map } from "./Enumerated";
import { Entity, EntityID } from "./Entity";
import { Energy } from './Units';
import { Dropoff } from "./Dropoff";
import { Location } from "./Location";

const enum _Player {}
export type PlayerID = class_id<_Player>;
export class Player extends Enumerated<_Player>{
  // std::string name;                    /**< The name of the player. */
  //   Location factory;                    /**< The factory location of the player. */
  //   std::vector<Dropoff> dropoffs;       /**< The dropoffs this player owns. */
  //   energy_type energy{};                /**< The amount of energy stockpiled by the player. */
  //   energy_type factory_energy_deposited{}; /**< The amount of energy deposited at the factory so far. */
  //   energy_type total_energy_deposited{}; /**< The amount of energy collected so far. */
  //   const std::string command;           /**< The bot command for the player. */
  //   id_map<Entity, Location> entities{}; 
  //   bool terminated;                     /**< Whether the player was kicked out of the game. */
  //   bool can_play = true;                /**< Whether the player has sufficient resources remaining. */

  name: string = '';
  factory: Location
  dropoffs: Array<Dropoff> =[]
  energy: Energy = 0;
  factory_energy_deposited: Energy = 0;
  total_energy_deposited: Energy = 0;
  public entities: Map<EntityID, Location> = new Map(); /**< Mapping from entity (ID) to location. */
  // not used due to dimensions framework
  public command: string = '';
  public terminated: boolean = false; 
  public can_play: boolean = true;

  constructor(id: PlayerID, factory: Location) {
    super(id)
    // don't store a ref, store the place
    this.factory = new Location(JSON.parse(JSON.stringify(factory.x)), JSON.parse(JSON.stringify(factory.y)));
    
  }
  to_json() {
    return JSON.stringify({
      player_id: this.id,
      name: this.name,
      energy: this.energy,
      factory_location: this.factory,
      entities: this.entities
    });
  }

  terminate() {
    this.terminated = true;
  }

  /**
   * Get the location of an entity.
   * @param id The entity ID.
   * @return The entity location.
   */
  get_entity_location(id: EntityID): Location {
    return this.entities.get(id);
  }
  /**
   * Get whether the player has an entity.
   * @param id The entity ID.
   * @return True if the player has the entity, false otherwise.
   */
  has_entity(id: EntityID): boolean {
    return this.entities.has(id);
  }
  /**
   * Remove an entity by ID.
   * @param id The entity ID.
   */
  remove_entity(id: EntityID): void {
    this.entities.delete(id);
  }
  /**
   * Add an entity by ID.
   * @param id The entity ID to add.
   * @param location The location of the entity.
   */
  add_entity(id: EntityID, location: Location) {
    this.entities.set(id, location);
  }
}