import { class_id, Enumerated } from './Enumerated';
import { PlayerID } from './Player';
import { Energy } from './Units';
declare const enum _Entity {
}
export declare type EntityID = class_id<_Entity>;
export declare class Entity extends Enumerated<_Entity> {
    owner_class_id: PlayerID;
    was_captured: boolean;
    is_inspired: boolean;
    energy: Energy;
    constructor(id: class_id<_Entity>, owner_class_id: PlayerID);
    to_json(): string;
}
export {};
