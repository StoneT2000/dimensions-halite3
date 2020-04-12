# Dimensions - Halite 3 Design

This is a typescript implementation of the [Halite 3 AI competition](https://halite.io) using the [Dimensions AI competition framework](https://github.com/stonet2000/dimensions). This simulates the original Halite 3 game quite closely, including features such as inspiration, mining, dropoffs and more!

You can run most bots that adhere to the Halite 3 starter kits. At the moment, C++, C bots don't really work due to no support for CMake and Make at the moment. Out of the box, Java, Python, Javascript / Typescript, PHP, Go should work. More will be added as Dimensions supports more options.

To start, first install it
```
npm install dimensions-ai @dimensions-ai/designs-halite3
```


To run a single match, run
```js
const Dimension = require('dimensions-ai');
const Halite3Design = require('@dimensions-ai/designs-halite3').default;

let halite3Design = new Halite3Design('Halite 3 Design');
let halite3Dimension = Dimension.create(halite3Design, {
  name: 'Halite 3', 
  loggingLevel: Dimension.Logger.LEVEL.DETAIL
});

halite3Dimension.runMatch(
  ["pathToMyBot.js", "pathToMyOtherBot.go"],
  {
    name: 'my-halite-match',
    loggingLevel: Dimension.Logger.LEVEL.INFO,
    replayDirectory: './replays',
  }
).then((res) => {
  console.log(res);
});
```

To run a trueskill ranked leaderboard like tournament, akin to the actual Halite 3 tournament, run


```js
let Tournament = Dimension.Tournament;
let simpleBots = ["pathToBot.js", "pathToSomeOtherBot.java", "anotherBot.cpp", "anotherOne.py"];
let halite3League = halite3Dimension.createTournament(simpleBots, {
  type: Tournament.TOURNAMENT_TYPE.LADDER, // specify ladder/leaderboard tournament
  rankSystem: Tournament.RANK_SYSTEM.TRUESKILL, // specify to use trueskill for ranking
  loggingLevel: Dimension.Logger.LEVEL.INFO,
  defaultMatchConfigs: {
    replayDirectory: './replays',
    loggingLevel: Dimension.Logger.LEVEL.ERROR,
  },
  agentsPerMatch: [2, 4], // specify that only 2 or 4 players can compete at the same time
  resultHandler: Halite3Design.trueskillResultHandler // use the trueskill result handler
});
halite3League.run();
```

For full details on how to run custom matches and tournaments, make sure to check out https://github.com/stonet2000/dimensions for details on how to run them.

Replays are automatically saved to the root folder. You can specify the `replayDirectory` field to give a directory to store replays in. To watch them, you can upload them to the online Halite 3 client at [https://2018.halite.io/watch-games](https://2018.halite.io/watch-games)

There are only a few features left out (that I know of at least). Error logs are not saved anywhere at this time, they are only printed to console if you set logging to a level of `Logger.LEVEL.WARN` or higher

I'm open to any contributions if you would like to fix/add something to this! Just open an issue or a PR
