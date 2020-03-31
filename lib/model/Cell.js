"use strict";
// export namespace Halite3Design {
//   export class Cell {
//     Energy: Cell.Energy;
Object.defineProperty(exports, "__esModule", { value: true });
//     constructor() {
//     }
//   }
//   namespace Cell {
//       export type Energy = number;
//   }
// }
var Cell = /** @class */ (function () {
    function Cell() {
        this.entity = null;
        this.owner = null;
        this.energy = 0;
    }
    Cell.prototype.to_json = function () {
        return JSON.stringify({
            energy: this.energy
        });
    };
    return Cell;
}());
exports.Cell = Cell;
//# sourceMappingURL=Cell.js.map