/**
 * Template for classes representing grids indexable along two dimensions.
 * @tparam Entry The type of entries in the grid.
 */
export declare class Grid<Entry> {
    width: number;
    height: number;
    /** The internal data storage. */
    grid: Array<Array<Entry>>;
    constructor();
    to_json(): void;
    /**
     * Ge an entry at grid coordinates.
     * @param x The grid x-coordinate.
     * @param y The grid y-coordinate.
     * @return Reference to the entry at (x, y).
     */
    at(x: number, y: number): any;
}
