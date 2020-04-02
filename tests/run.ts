import * as Dimension from 'dimensions-ai';
import Halite3Design from '../src/index';


let halite = new Halite3Design('Domination', {
  commandDelimiter: ' '
});
let myDimension = Dimension.create(halite, 'Domination', Dimension.Logger.LEVEL.ALL);

let botSources = [];
let starterBot = './starter-kits/js/starter/MyBot.js';
let stoneBot = './starter-kits/js/currentBot/MyBot.js';
botSources.push(stoneBot);
botSources.push(starterBot);

// let expectedResultMap = [ [ 0, 1, 2, 3 ], [ 3, 3, 3, 3 ], [ -1, -1, -1, -1 ], [ -1, -1, -1, -1 ] ];
// let expectedScore = 5; 


myDimension.runMatch(
  botSources,
  {
    name: 'test-halite-match',
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
  console.log(res);
})