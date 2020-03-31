"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var Enumerated_1 = require("./Enumerated");
var Player = /** @class */ (function (_super) {
    __extends(Player, _super);
    function Player(id, factory) {
        var _this = _super.call(this, id) || this;
        _this.energy = 0;
        _this.factory_energy_deposited = 0;
        _this.total_energy_deposited = 0;
        _this.entities = new Map(); /**< Mapping from entity (ID) to location. */
        // not used due to dimensions framework
        _this.command = '';
        _this.terminated = false;
        _this.can_play = true;
        _this.factory = factory;
        return _this;
    }
    Player.prototype.to_json = function () {
        return JSON.stringify({
            player_id: this.id,
            name: this.name,
            energy: this.energy,
            factory_location: this.factory,
            entities: this.entities
        });
    };
    /**
     * Get the location of an entity.
     * @param id The entity ID.
     * @return The entity location.
     */
    Player.prototype.get_entity_location = function (id) {
        return this.entities.get(id);
    };
    /**
     * Get whether the player has an entity.
     * @param id The entity ID.
     * @return True if the player has the entity, false otherwise.
     */
    Player.prototype.has_entity = function (id) {
        return this.entities.has(id);
    };
    /**
     * Remove an entity by ID.
     * @param id The entity ID.
     */
    Player.prototype.remove_entity = function (id) {
        this.entities.delete(id);
    };
    /**
     * Add an entity by ID.
     * @param id The entity ID to add.
     * @param location The location of the entity.
     */
    Player.prototype.add_entity = function (id, location) {
        this.entities.set(id, location);
    };
    return Player;
}(Enumerated_1.Enumerated));
exports.Player = Player;
//# sourceMappingURL=Player.js.map