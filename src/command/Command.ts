import { EntityID } from "../model/Entity";
import { Direction } from "../model/Location";
import { CommandName } from "./CommandTransaction";

const JSON_TYPE_KEY = "type";
/** The JSON key for entity id. */
const JSON_ENTITY_KEY = "id";
/** The JSON key for direction. */
const JSON_DIRECTION_KEY = "direction";
/** The JSON key for energy. */
const JSON_ENERGY_KEY = "energy";
export abstract class Command {
  public abstract name: string
  abstract to_json(): any
}
export class MoveCommand extends Command {
  // MoveCommand(const Entity::id_type &entity, Direction direction) : entity(entity), direction(direction) {}
  public name = 'move'
  constructor(public entity: EntityID = null, public direction: Direction = null) {
    super();
  }
  to_json() {
    let json = {};
    json[JSON_TYPE_KEY] = CommandName.Move;
    json[JSON_ENTITY_KEY] = this.entity;
    json[JSON_DIRECTION_KEY] = this.direction;
    return json;
  }
}

export class ConstructCommand extends Command {
  // explicit ConstructCommand(const Entity::id_type &entity) : entity(entity) {}
  public name = 'construct'
  constructor(public entity: EntityID = null) {
    super();
  }
  to_json() {
    let json = {};
    json[JSON_TYPE_KEY] = CommandName.Construct;
    json[JSON_ENTITY_KEY] = this.entity;
    return json;
  }
}

export class SpawnCommand extends Command {
  public name = 'spawn'
  constructor() {
    super();
  }
  to_json() {
    let json = {};
    json[JSON_TYPE_KEY] = CommandName.Spawn;
    return json;
  }
}
export class NoCommand extends Command {
  public name = 'none'
  to_json() {

  }
}