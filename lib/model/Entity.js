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
var Entity = /** @class */ (function (_super) {
    __extends(Entity, _super);
    function Entity(id, owner_class_id) {
        var _this = _super.call(this, id) || this;
        _this.owner_class_id = owner_class_id;
        _this.was_captured = false;
        _this.is_inspired = false;
        return _this;
    }
    Entity.prototype.to_json = function () {
        return JSON.stringify({
            id: this.id,
            is_inspired: this.is_inspired,
            energy: this.energy
        });
    };
    return Entity;
}(Enumerated_1.Enumerated));
exports.Entity = Entity;
//# sourceMappingURL=Entity.js.map