import { Enumerated, class_id } from "./Enumerated";
import { Location } from "./Location";
import { Energy } from "./Units";

const enum _Dropoff {}
export type DropoffID = class_id<_Dropoff>;
export class Dropoff extends Enumerated<_Dropoff>{
  public deposited_halite: Energy = 0;
  constructor(id: DropoffID, public location: Location) {
    super(id);
  }
}