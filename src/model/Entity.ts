import { class_id, Enumerated } from './Enumerated';
import { Player, PlayerID } from './Player';
import { Energy } from './Units';

const enum _Entity {}
export type EntityID = class_id<_Entity>;
export class Entity extends Enumerated<_Entity> {

  public was_captured: boolean = false;
  public is_inspired: boolean = false;
  constructor(id: class_id<_Entity>, public owner: PlayerID, public energy: Energy) {
    super(id);
  }
  to_json() {
    return JSON.stringify({
      id: this.id,
      is_inspired: this.is_inspired,
      energy: this.energy
    });
  }
}

// entity, player, etc. factories
export class Factory<T> {
  public last_id: number = 0;
  constructor(public type) {

  }
  make(...args): T {
    //@ts-ignore
    return new this.type(this.last_id++, ...args)
  }
  make_with_id(id, ...args): T {
    //@ts-ignore
    return new this.type(id, ...args);
  }l
}