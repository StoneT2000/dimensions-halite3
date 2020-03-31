import { EntityID } from "./Entity";
import { PlayerID } from "./Player";
import { Energy } from "./Units";
export declare class Cell {
    entity: EntityID;
    owner: PlayerID;
    energy: Energy;
    constructor();
    to_json(): string;
}
