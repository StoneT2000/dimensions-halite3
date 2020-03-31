import { PlayerID } from "../model/Player";
import { Location } from "../model/Location";
import { Energy } from "../model/Units";
import { EntityID } from "../model/Entity";
import { DropoffID } from "../model/Dropoff";


export class PlayerSnapshot {
  // energy_type energy;
  //   Location factory{0,0};
  //   std::vector<std::pair<Dropoff::id_type, Location>> dropoffs;
  //   std::vector<EntitySnapshot> entities;
  energy: Energy = 0;
  factory: Location = new Location(0, 0);
  dropoffs: Array<{id: DropoffID, location: Location}> = [];
  entities: Array<EntitySnapshot> = [];
  constructor() {

  }
}
export class EntitySnapshot {
  constructor(public id: EntityID, public energy: Energy, public location: Location) {

  }
}
export class Snapshot {
  // TODO
  // mapgen::MapParameters map_param{};
  //   
  map_param: any;

  // Each row laid out end-to-end
  map: Array<Energy> = [];
  players: Map<PlayerID, PlayerSnapshot> = new Map();

  constructor(map_param: any = {}, map: Array<Energy> = [], players: Map<PlayerID, PlayerSnapshot> = new Map()) {
    this.map = map;
    this.players = players;
    this.map_param = map_param;
  }
  // TODO: Implement
  static from_str(snapshot: string): Snapshot {
    return new Snapshot();
  }
}