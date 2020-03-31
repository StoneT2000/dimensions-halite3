import { Enumerated, class_id } from "./Enumerated";
import { Location } from "./Location";
declare const enum _Dropoff {
}
export declare type DropoffID = class_id<_Dropoff>;
export declare class Dropoff extends Enumerated<_Dropoff> {
    location: Location;
    constructor(id: DropoffID, location: Location);
}
export {};
