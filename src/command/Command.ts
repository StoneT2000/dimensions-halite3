import { EntityID } from "../model/Entity";
import { Direction } from "../model/Location";

export abstract class Command {
  public abstract name: string
}
export class MoveCommand extends Command {
  // MoveCommand(const Entity::id_type &entity, Direction direction) : entity(entity), direction(direction) {}
  public name: 'move'
  constructor(public entity: EntityID = null, public direction: Direction = null) {
    super();
  }
}

export class ConstructCommand extends Command {
  // explicit ConstructCommand(const Entity::id_type &entity) : entity(entity) {}
  public name: 'construct'
  constructor(public entity: EntityID = null) {
    super();
  }
}

export class SpawnCommand extends Command {
  public name: 'spawn'
  constructor() {
    super();
  }
}