"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Direction;
(function (Direction) {
    Direction["North"] = "n";
    Direction["South"] = "s";
    Direction["East"] = "e";
    Direction["West"] = "w";
    Direction["Still"] = "o";
})(Direction = exports.Direction || (exports.Direction = {}));
;
var Location = /** @class */ (function () {
    /**
     * Construct Location from coordinates.
     * @param x The x-coordinate.
     * @param y The y-coordinate.
     */
    function Location(x, y) {
        this.x = x;
        this.y = y;
    }
    /**
     * Compare to another Location by equality.
     * @param location The other Location.
     * @return True if this Location is equal to the other.
     */
    Location.prototype.equals = function (loc) {
        return this.x === loc.x && this.y === loc.y;
    };
    Location.prototype.to_json = function () {
        return JSON.stringify({
            x: this.x,
            y: this.y
        });
    };
    return Location;
}());
exports.Location = Location;
//# sourceMappingURL=Location.js.map