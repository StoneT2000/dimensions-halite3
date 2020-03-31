"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Location_1 = require("./Location");
/**
 * Template for classes representing grids indexable along two dimensions.
 * @tparam Entry The type of entries in the grid.
 */
var Grid = /** @class */ (function () {
    /**
     * Create a Grid from dimensions.
     * @param width The width.
     * @param height The height.
     */
    function Grid(width, height) {
        if (width === void 0) { width = 0; }
        if (height === void 0) { height = 0; }
        this.width = 0;
        this.height = 0;
        this.width = width;
        this.height = height;
        for (var i = 0; i < width; i++) {
            var row = [];
            row.fill(null, 0, height);
            this.grid.push(row);
        }
    }
    Grid.prototype.to_json = function () {
    };
    /**
     * Get entry at a location.
     * @param location The location.
     * @return Reference to the entry at (x, y).
     */
    Grid.prototype.at = function (a1, a2) {
        if (a1 instanceof Location_1.Location) {
            var location_1 = a1;
            var x = location_1.x, y = location_1.y;
            return [y][x];
        }
        else if (typeof a1 == 'number') {
            return [a2][a1];
        }
    };
    return Grid;
}());
exports.Grid = Grid;
//# sourceMappingURL=Grid.js.map