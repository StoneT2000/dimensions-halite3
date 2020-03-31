import { class_id, Enumerated } from "./Enumerated";
import { EntityID } from "./Entity";
import { Energy } from './Units';
import { Dropoff } from "./Dropoff";
import { Location } from "./Location";
declare const enum _Player {
}
export declare type PlayerID = class_id<_Player>;
export declare class Player extends Enumerated<_Player> {
    name: string;
    factory: Location;
    dropoffs: Array<Dropoff>;
    energy: Energy;
    factory_energy_deposited: Energy;
    total_energy_deposited: Energy;
    entities: Map<EntityID, Location>; /**< Mapping from entity (ID) to location. */
    command: string;
    terminated: boolean;
    can_play: boolean;
    constructor(id: PlayerID, factory: Location);
    to_json(): string;
    /**
     * Get the location of an entity.
     * @param id The entity ID.
     * @return The entity location.
     */
    get_entity_location(id: EntityID): Location;
    /**
     * Get whether the player has an entity.
     * @param id The entity ID.
     * @return True if the player has the entity, false otherwise.
     */
    has_entity(id: EntityID): boolean;
    /**
     * Remove an entity by ID.
     * @param id The entity ID.
     */
    remove_entity(id: EntityID): void;
    /**
     * Add an entity by ID.
     * @param id The entity ID to add.
     * @param location The location of the entity.
     */
    add_entity(id: EntityID, location: Location): void;
}
export {};
