import { BlurTileGenerator } from "./BlurTileGenerator";
import { MapParameters, MapType } from "./GeneratorBase";
import { Map } from "../model/Map";
import { FractalValueNoiseTileGenerator } from "./FractalValueNoiseTileGenerator";

export class MapGenerator {
  static generateWithParams(map: Map, parameters: MapParameters): void {
    switch (parameters.type) {
      case MapType.Basic:
          // return BasicGenerator(parameters).generate(map);
          break;
      case MapType.BlurTile:
          (new BlurTileGenerator(parameters)).generate(map);
          break;
      case MapType.Fractal:
          (new FractalValueNoiseTileGenerator(parameters)).generate(map);
          break;
      }
  }
}