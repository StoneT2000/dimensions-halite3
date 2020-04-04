import * as Dimension from 'dimensions-ai';
import Halite3Design from '../src/index';


let halite3Design = new Halite3Design('Halite 3 Design', {
  commandDelimiter: ' '
});
let myDimension = Dimension.create(halite3Design, {
  name: 'Halite 3', 
  loggingLevel: Dimension.Logger.LEVEL.ALL
});

let botSources = [];
let starterBotJS = './starter-kits/js/starter/MyBot.js';
let starterBotPY = './starter-kits/python/MyBot.py';
let stoneBot = './bots/stoneBot/MyBot.js';
let TeamSchildpad = './bots/TeamSchildpad/MyBot.py';
// botSources.push(stoneBot);
botSources.push(starterBotJS);
botSources.push(starterBotPY);
botSources.push(starterBotPY);
botSources.push(starterBotJS);

// myDimension.runMatch(
//   botSources,
//   {
//     name: 'test-halite-match',
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
//   console.log(res);
// });
botSources = [];
botSources.push(stoneBot);
botSources.push(stoneBot);
botSources.push(stoneBot);
botSources.push(stoneBot);
myDimension.runMatch(
  botSources,
  {
    name: 'stone-vs-stone-halite',
    timeout: 1000,
    initializeConfig: {
      width: 32,
      height: 32,
      game_seed: 15912302
    },
    loggingLevel: Dimension.Logger.LEVEL.INFO,
    replayDirectory: './replays'
  }
).then((res) => {
  // console.log(res);
})