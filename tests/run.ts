import * as Dimension from 'dimensions-ai';
import Halite3Design from '../src/index';


let halite = new Halite3Design('Domination', {
  commandDelimiter: ' '
});
let myDimension = Dimension.create(halite, 'Domination', Dimension.Logger.LEVEL.ALL);

let botSources = [];
let jsSource = './starter-kits/js/MyBot.js';
for (let i = 0; i < 2; i++) {
  botSources.push(jsSource);
}
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
    loggingLevel: Dimension.Logger.LEVEL.ALL
  }
).then((res) => {
  console.log(res);
})