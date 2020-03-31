"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var GameMap = /** @class */ (function () {
    function GameMap(width, height) {
        this.map = [];
        this.players = [];
        for (var i = 0; i < height; i++) {
            this.map.push([]);
            for (var j = 0; j < width; j++) {
                this.map[this.map.length - 1].push(100);
            }
        }
    }
    return GameMap;
}());
exports.GameMap = GameMap;
//# sourceMappingURL=gameMap.js.map