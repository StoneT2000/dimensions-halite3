export declare enum Direction {
    North = "n",
    South = "s",
    East = "e",
    West = "w",
    Still = "o"
}
export declare class Location {
    x: number;
    y: number;
    /**
     * Construct Location from coordinates.
     * @param x The x-coordinate.
     * @param y The y-coordinate.
     */
    constructor(x: number, y: number);
    /**
     * Compare to another Location by equality.
     * @param location The other Location.
     * @return True if this Location is equal to the other.
     */
    equals(loc: Location): boolean;
    to_json(): string;
}
