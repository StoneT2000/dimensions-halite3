export declare type class_id<T> = number & T;
export declare class Enumerated<T> {
    id: class_id<T>;
    /**
     * Must be supered
     */
    constructor(id: class_id<T>);
}
export declare type ID_Map<T, V> = Map<class_id<T>, V>;
