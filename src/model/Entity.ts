import { class_id, Enumerated } from './Enumerated';
import { Player, PlayerID } from './Player';
import { Energy } from './Units';

const enum _Entity {}
export type EntityID = class_id<_Entity>;
export class Entity extends Enumerated<_Entity> {

  public was_captured: boolean = false;
  public is_inspired: boolean = false;
  public energy: Energy;
  constructor(id: class_id<_Entity>, public owner_class_id: PlayerID) {
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