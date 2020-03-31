export class GameMap {
  public map = [];
  public players = [];
  constructor(width: number, height: number) {
    for (let i = 0; i  < height; i++) {
      this.map.push([]);
      for (let j = 0; j < width; j++) {
        this.map[this.map.length - 1].push(100);
      }
    }
  }
}