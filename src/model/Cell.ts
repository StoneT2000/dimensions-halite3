// export namespace Halite3Design {
//   export class Cell {
//     Energy: Cell.Energy;

import { EntityID } from "./Entity";
import { PlayerID } from "./Player";
import { Energy } from "./Units";

//     constructor() {

//     }
//   }
//   namespace Cell {
//       export type Energy = number;
//   }
// }

export class Cell {
  public entity: EntityID = null;
  public owner: PlayerID = null;
  public energy: Energy = 0;
  constructor() {

  }
  to_json() {
    return JSON.stringify({
      energy: this.energy
    })
  }
}