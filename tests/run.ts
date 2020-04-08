import * as Dimension from 'dimensions-ai';
import Halite3Design from '../src/index';
import { Tournament, LoggerLEVEL } from 'dimensions-ai';


let halite3Design = new Halite3Design('Halite 3 Design');
let halite3Dimension = Dimension.create(halite3Design, {
  name: 'Halite 3', 
  loggingLevel: Dimension.Logger.LEVEL.ALL
});


let botSources = [];
let starterBotJS = './starter-kits/js/starter/MyBot.js';
let stillBotJs = './starter-kits/js/starter/StillBot.js';
let starterBotPY = './starter-kits/python/MyBot.py';
let stoneBot = './bots/stoneBot/MyBot.js';

// botSources.push(stoneBot);
botSources.push(stoneBot);
// botSources.push(TeamSchildpad);
botSources.push(starterBotJS);
// botSources.push(starterBotPY);
// botSources.push(starterBotPY);
// botSources.push(starterBotJS);

// halite3Dimension.runMatch(
//   botSources,
//   {
//     name: 'test-halite-match',
//     replayDirectory: './replays'
//   }
// ).then((res) => {
//   console.log(res);
// });
let halite3League = halite3Dimension.createTournament([starterBotJS, stillBotJs, stillBotJs, starterBotPY], {
  type: Tournament.TOURNAMENT_TYPE.ROUND_ROBIN,
  rankSystem: Tournament.RANK_SYSTEM.WINS,
  loggingLevel: LoggerLEVEL.DETAIL,
  defaultMatchConfigs: {
    replayDirectory: './replays',
    loggingLevel: LoggerLEVEL.INFO,
    engineOptions: {
      timeout: {
        max: 5000
      }
    }
  },
  resultHandler: Halite3Design.winLossResultHandler
});
halite3League.run().then((res) => {
  console.log(res);
})
// halite3League.createMatch(
//   botSources,
//   {
//     name: 'test-engine-change-match',
//     initializeConfig: {
//       seed: 123233,
//       map_type: 'fractal',
//       width: 32,
//       height: 32
//     },
//     loggingLevel: Dimension.Logger.LEVEL.DETAIL,
//     replayDirectory: './replays',
//     engineOptions: {
//       timeout: {
//         max: 100
//       }
//     }
//   }
// ).then((res) => {
//   // console.log(res);
// });


// let halite3Design100ms = new Halite3Design('Halite 3 Design - 100ms Timeout', {
//   engineOptions: {
//     timeout: {
//       max: 100
//     }
//   }
// });
// let halite3League100ms = Dimension.create(halite3Design100ms, {
//   name: 'Halite 3', 
//   loggingLevel: Dimension.Logger.LEVEL.ALL
// });
// botSources = [];
// botSources.push(stoneBot);
// botSources.push(stoneBot);
// botSources.push(stoneBot);
// botSources.push(stoneBot);
// halite3League100ms.createMatch(
//   botSources,
//   {
//     name: 'stone-vs-stone-halite',
//     initializeConfig: {
//       seed: 15912392
//     },
//     loggingLevel: Dimension.Logger.LEVEL.INFO,
//     replayDirectory: './replays'
//   }
// ).then((res) => {
//   // console.log(res);
// })