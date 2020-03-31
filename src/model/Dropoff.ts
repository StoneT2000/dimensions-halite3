import { Enumerated, class_id } from "./Enumerated";
import { Location } from "./Location";

const enum _Dropoff {}
export type DropoffID = class_id<_Dropoff>;
export class Dropoff extends Enumerated<_Dropoff>{
  constructor(id: DropoffID, public location: Location) {
    super(id);
  }
}