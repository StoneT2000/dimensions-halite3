import * as Dimension from 'dimensions-ai';
import Halite3Design from '../src/index';
import { MapType } from '../src/mapgen/GeneratorBase';


let halite3Design = new Halite3Design('Halite 3 Design', {
  engineOptions: {
    commandDelimiter: ' ',
    commandFinishPolicy: Dimension.COMMAND_FINISH_POLICIES.LINE_COUNT,
    commandLines: {
      max: 1
    }
  }
});
let myDimension = Dimension.create(halite3Design, {
  name: 'Halite 3', 
  loggingLevel: Dimension.Logger.LEVEL.ALL
});

let botSources = [];
let starterBotJS = './starter-kits/js/starter/MyBot.js';
let stillBotJs = './starter-kits/js/starter/StillBot.js';
let starterBotPY = './starter-kits/python/MyBot.py';
let stoneBot = './bots/stoneBot/MyBot.js';
let TeamSchildpad = './bots/TeamSchildpad/MyBot.py';
// botSources.push(stoneBot);
botSources.push(stoneBot);
botSources.push(stillBotJs);
// botSources.push(starterBotJS);
// botSources.push(starterBotPY);
// botSources.push(starterBotPY);
// botSources.push(starterBotJS);

myDimension.runMatch(
  botSources,
  {
    name: 'test-halite-match',
    timeout: 1000,
    initializeConfig: {
      seed: 3,
      map_type: 'fractal',
      width: 32,
      height: 32
    },
    loggingLevel: Dimension.Logger.LEVEL.DETAIL,
    replayDirectory: './replays'
  }
).then((res) => {
  console.log(res);
});
botSources = [];
botSources.push(stoneBot);
botSources.push(stoneBot);
botSources.push(stoneBot);
botSources.push(stoneBot);
// myDimension.runMatch(
//   botSources,
//   {
//     name: 'stone-vs-stone-halite',
//     timeout: 1000,
//     initializeConfig: {
//       width: 32,
//       height: 32,
//       game_seed: 15912302
//     },
//     loggingLevel: Dimension.Logger.LEVEL.INFO,
//     replayDirectory: './replays'
//   }
// ).then((res) => {
//   // console.log(res);
// })