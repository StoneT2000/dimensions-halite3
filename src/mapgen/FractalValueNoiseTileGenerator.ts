import { MapParameters } from "./GeneratorBase";
import { Map } from "../model/Map";
import { Constants } from "../Constants";
import { SymmetricalTile } from "./SymmetricalTile";

export class FractalValueNoiseTileGenerator extends SymmetricalTile {
  constructor(parameters: MapParameters) {
    super(parameters);
  }
  generateSmoothNoise(source_noise: Array<Array<number>>, wavelength: number) {
    // mini_source(ceil(double(source_noise.size()) / wavelength),
                                                  // std::vector<double>(ceil(double(source_noise[0].size()) / wavelength),
    //                                                                   0));
    // initialize to that size with those arrays as elements

    let mini_source: Array<Array<number>> = [];
    let temp_arr = [];
    let sublen = Math.ceil(source_noise[0].length / wavelength)
    let len = Math.ceil(source_noise.length / wavelength);
    for (let i = 0; i < len; i++) {
      mini_source.push([]);
    }
    for (let i = 0; i < len; i++) {
      for (let j =0 ; j < sublen; j++) {
        mini_source[i].push(0);
      }
    }

    for (let y = 0; y < mini_source.length; y++) {
      for (let x = 0; x < mini_source[0].length; x++) {
          mini_source[y][x] = source_noise[wavelength * y][wavelength * x];
      }
    }
    // std::vector<std::vector<double> > smoothed_source(source_noise.size(),
    //                                                   std::vector<double>(source_noise[0].size(), 0));
    let smoothed_source: Array<Array<number>> = [];
    
    sublen = source_noise[0].length;
    len = source_noise.length;
    for (let i = 0; i < len; i++) {
      smoothed_source.push([]);
    }
    for (let i = 0; i < len; i++) {
      for (let j =0 ; j < sublen; j++) {
        smoothed_source[i].push(0);
      }
    }

    for (let y = 0; y < source_noise.length; y++) {
        let y_i = Math.floor(y / wavelength)
        let y_f = (Math.floor(y / wavelength) + 1) % mini_source.length;
        let vertical_blend = y / wavelength - y_i;
        for (let x = 0; x < source_noise[0].length; x++) {
            let x_i = Math.floor(x / wavelength)
            let x_f = (Math.floor(x / wavelength) + 1) % mini_source[0].length;
            let horizontal_blend = x / wavelength - x_i;

            let top_blend =
                    (1 - horizontal_blend) * mini_source[y_i][x_i] + horizontal_blend * mini_source[y_i][x_f];
            let bottom_blend =
                    (1 - horizontal_blend) * mini_source[y_f][x_i] + horizontal_blend * mini_source[y_f][x_f];
            smoothed_source[y][x] = (1 - vertical_blend) * top_blend + vertical_blend * bottom_blend;
        }
    }
    
    return smoothed_source;
  }
  generate(map: Map) {
    let tile = new Map(this.tile_width, this.tile_height);
    // std::vector<std::vector<double> > source_noise(tile_height, std::vector<double>(tile_width, 0));
    let source_noise = [];
    for (let i = 0; i < this.tile_height; i++) {
      source_noise.push([]);
    }
    for (let i = 0; i < this.tile_height; i++) {
      for (let j =0 ; j < this.tile_width; j++) {
        source_noise[i].push(0);
      }
    }
    // std::vector<std::vector<double> > region = source_noise;
    let region = JSON.parse(JSON.stringify(source_noise));

    const FACTOR_EXP_1 = Constants.FACTOR_EXP_1;
    const FACTOR_EXP_2 = Constants.FACTOR_EXP_2;
    const PERSISTENCE = Constants.PERSISTENCE;

    // std::uniform_real_distribution<double> urd(0.0, 1.0);
    for (let y = 0; y < this.tile_height; y++) {
      for (let x = 0; x < this.tile_width; x++) {
          // source_noise[y][x] = pow(urd(rng), FACTOR_EXP_1);
          // using Math.random() for now, which might be 128 bits of randomness, not the mersenne twister 32 bits? as // specified by the rng member field
          source_noise[y][x] = Math.pow(this.rng.random(), FACTOR_EXP_1);
          
      }
    }

    // const int MAX_OCTAVE = floor(log2(std::min(tile_width, tile_height))) + 1;
    const MAX_OCTAVE = Math.floor(Math.log2(Math.min(this.tile_width, this.tile_height))) + 1;
    let amplitude = 1;
    for (let octave = 2; octave <= MAX_OCTAVE; octave++) {
      let smoothed_source = this.generateSmoothNoise(source_noise, Math.round(Math.pow(2, MAX_OCTAVE - octave)));
      // if (octave == 2) console.log(smoothed_source);
      for (let y = 0; y < this.tile_height; y++) {
        for (let x = 0; x < this.tile_width; x++) {
            region[y][x] += amplitude * smoothed_source[y][x];
        }
      }
      amplitude *= PERSISTENCE;
    }
    
    for (let y = 0; y < this.tile_height; y++) {
      for (let x = 0; x < this.tile_width; x++) {
        region[y][x] += amplitude * source_noise[y][x];
      }
    }
    
  
    // Make productions spikier using exponential. Also find max value.
    let max_value = 0;
    for (let y = 0; y < this.tile_height; y++) {
      for (let x = 0; x < this.tile_width; x++) {
        region[y][x] = Math.pow(region[y][x], FACTOR_EXP_2);
        if (region[y][x] > max_value) max_value = region[y][x];
      }
    }
    

    // Normalize to highest value
    // const energy_type MAX_CELL_PRODUCTION =
            // rng() % (1 + Constants::get().MAX_CELL_PRODUCTION - Constants::get().MIN_CELL_PRODUCTION) +
            // Constants::get().MIN_CELL_PRODUCTION;
    const MAX_CELL_PRODUCTION = this.rng.random_int() % (1 + Constants.MAX_CELL_PRODUCTION - Constants.MIN_CELL_PRODUCTION) + Constants.MIN_CELL_PRODUCTION;
    for (let y = 0; y < this.tile_height; y++) {
      for (let x = 0; x < this.tile_width; x++) {
        region[y][x] *= Math.floor(MAX_CELL_PRODUCTION / max_value);
        tile.grid[y][x].energy = Math.round(region[y][x]);
      }
    }

    const factory_pos_x = Math.floor((this.rng.random_int() % this.tile_width));
    const factory_pos_y = Math.floor((this.rng.random_int() % this.tile_height));
    // Use superclass function to copy the tile over the entire map, including placing all factories
    this.tile_map(map, factory_pos_y, factory_pos_x, tile);
  }
}