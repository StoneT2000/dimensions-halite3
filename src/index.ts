import { Design, Match, Command, MatchStatus, Agent, Logger, MatchError } from 'dimensions-ai';
import { Constants } from './Constants';

import { Command as HCommand, MoveCommand, ConstructCommand, SpawnCommand } from './command/Command';
import { Map as GameMap } from './model/Map';
import { Store } from './Store';
import { Player, PlayerID } from './model/Player';
import { Generator } from './mapgen/Generator';
import { Factory, Entity, EntityID } from './model/Entity';
import { Direction, Location } from './model/Location';
import { CommandName, CommandTransaction } from './command/CommandTransaction';
import { Dropoff } from './model/Dropoff';

type haliteState = {
  playerCount: number // should only be 2 or 4
  game: Game
}
type Game = {
  map: GameMap
  game_statistics?: any
  replay?: any
  logs?: any
  store: Store,
  turn_number: number
}


export default class Halite3Design extends Design {
  
  initializeGameState(match: Match, width: number, height: number, numPlayers: number) {
    let map = new GameMap(width, height);

    Generator.generateBasic(map, numPlayers);
    let store = new Store();

    // load map data into store
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
          store.map_total_energy += map.at(row, col).energy;
      }
    }
    
    for (let i = 0; i < match.agents.length; i++) {
      let agent = match.agents[i];
      let player = store.player_factory.make_with_id(agent.id, map.factories[i]);
      player.energy = Constants.INITIAL_ENERGY;

      // TODO: if given a snapshot, update values accordingly

      // store player into store
      store.players.set(player.id, player);
    }

    store.players.forEach((player: Player, playerID: PlayerID) => {
      // Zero the energy on factory and mark as owned.
      let factory = map.atLocation(player.factory);
      store.map_total_energy -= factory.energy;
      factory.energy = 0;
      factory.owner = playerID;
    });

    let game = {
      map: map,
      turn_number: 0,
      store: store
    };
    
    return game;
  }

  async initialize(match: Match) {
    /**
     * TODOS: Relevant things not implemented yet. same comment as comment in relevant code in HaliteImpl.cpp
     * Update max turn # by map size (300 @ 32x32 to 500 at 80x80)
     * 
     * Add a 0 frame so we can record beginning-of-game state
     * 
     * Load the map from the snapshot (if provided in configs or cli)
     * 


    /**
     * 0. NOTE, delimiter is commonly a ' ' (space)
     * 1. sendall raw constants √
     * 2. send number of players and the agent's ID √
     * 3. send all players each agent's id, then starting shipyard location √
     * 4. Send all players width height
     *    then row by row the map with halite info
     */
    let numPlayers = match.agents.length;
    let width = match.configs.initializeConfig.width;
    let height = match.configs.initializeConfig.height;
    if (match.configs.initializeConfig.game_seed) {
      Constants.game_seed = match.configs.initializeConfig.game_seed;
    }
    let game = this.initializeGameState(match, width, height, numPlayers);
    let state: haliteState = {
      playerCount: match.agents.length,
      game: game
    }

    // TODO, store map width height and constants from map gen
    // send the raw constants
    match.sendAll(JSON.stringify(Constants));
    
    // Send the number of players and player ID
    state.game.store.players.forEach((player: Player) => {
      match.send(`${numPlayers} ${player.id}`, player.id);
    })
    // Send each player's ID and factory location
    state.game.store.players.forEach((player: Player) => {
      match.sendAll(`${player.id} ${player.factory.x} ${player.factory.y}`);
    })

    // Send map data, which is width height \n row by row each cells energy
    match.sendAll(`${width} ${height}`);

    // now we iterate through each row on the game map and output it all (each cell's energy)
    state.game.map.grid.forEach((rowOfCells) => {
      match.sendAll(rowOfCells.map((cell) => cell.energy).join(' '));
    });


    match.state = state;
  }
  async update(match: Match, commands: Array<Command>): Promise<MatchStatus> {
 
    let game: Game = match.state.game;
    match.log.info(`last status: ${MatchStatus[match.matchStatus]}`);
    match.log.info(`time step: ${match.timeStep}`);

    // essentially keep skipping the actual running of the match until we receive commands
    if (game.turn_number == 0 && commands.length == 0) {
      return MatchStatus.RUNNING;
    }

    // see if players/agents are ready
    
    match.log.info(`Starting turn ${game.turn_number}`);
    if (game.turn_number == 0) {
      for (let i = 0; i < commands.length; i++) {
        match.log.info(`Player: ${commands[i].agentID} is ready | Name: ${commands[i].command}`);
      }
      match.log.info(`Player initialization complete`);
    }

    /** Updating stage. Halite does it by sending updated frame data to each agent, and then processing their commands and advancing the turn. We will process commands first (empty at first), send updated frames return MatchStatus.RUNNING, then back to process commands 
     * 1. Process turn, update match state
     * 2. Send new match state to agents
     * 3. 
     */
    // don't process turn 0 as it is anomaly as it is onyl turn when bot sends its name and not commands
    if (game.turn_number != 0) {
      match.log.info('Updating Frames');
      this.update_inspiration();
      this.processTurn(match, commands);
    }
    game.turn_number++;
    // send turn number
    match.sendAll(`${game.turn_number}`);
    game.store.players.forEach((player: Player) => {
      //send all player's each players data: player numShips numDropoffs halite 
      match.sendAll(`${player.id} ${player.entities.size} ${player.dropoffs.length} ${player.energy}`);
      // output list of entities
      player.entities.forEach((location: Location, entity_id: EntityID) => {
        // id location=( x y ) energy\n
        match.sendAll(`${entity_id} ${location.x} ${location.y} ${game.store.entities.get(entity_id).energy}`);
        
      });
      // output list of dropoffs
      player.dropoffs.forEach((dropoff: Dropoff) => {
        // id xPos yPos
        match.sendAll(`${dropoff.id} ${dropoff.location.x} ${dropoff.location.y}`);
      });
    })

    // send size of change first
    match.sendAll(`${game.store.changed_cells.size}`);
    game.store.changed_cells.forEach((location: Location)=> {
      // send x y energy
      match.sendAll(`${location.x} ${location.y} ${game.map.atLocation(location).energy}`);
    })

    if (this.gameEnded(match)) {
      game.turn_number++;
      return MatchStatus.FINISHED;
    }
    return MatchStatus.RUNNING;

    
  }
  update_inspiration() {
    // TODO
  }
  processTurn(match: Match, commands: Array<Command>) {
    let game: Game = match.state.game;
    game.store.players.forEach((player: Player) => {
      if (!player.terminated) {
        // send this player data
      }
    });
    let commandsMap: Map<PlayerID, Array<HCommand>> = this.getCommandsMap(match, commands);
    

    // we need to store the two following changes to entities and cells make it easier to process the turn
    
    // basically, first sort commands into a map of array of commands bunched appropriately due to only space delimeters
    // move: m {id} {dir}
    // construct: c {id}
    // spawn: g
    
    while(commandsMap.size != 0) {
      game.store.changed_entities.clear();
      game.store.changed_cells.clear();
      // from this commands map, create transactions of which we will check each players transactions
      // we will create a single CommandTransactions object compose of all player commands
      let transaction = new CommandTransaction(game.store, game.map);
      // std::unordered_set<Player::id_type> offenders;
      let offenders = new Set();

      // halite has all these callbacks to handle errors and cell and entity update.
      // instead for updates (not errors yet TODO), the transaction itself does it as it is passed refs to store and map

      // let add all the commands
      commandsMap.forEach((command_list, player_id) => {
        command_list.forEach((command) => {
          let player = game.store.players.get(player_id);
          transaction.addCommand(player, command);
        });
      });

      if (transaction.check()) {
        transaction.commit();
        console.log(game.store.changed_entities);
        console.log(game.store.changed_cells);
        // console.log(game.store.players.get(0).entities);
        if (Constants.STRICT_ERRORS) {
          // if (!offenders.empty()) {
          //   std::ostringstream stream;
          //   stream << "Command processing failed for players: ";
          //   for (auto iterator = offenders.begin(); iterator != offenders.end(); iterator++) {
          //       stream << *iterator;
          //       if (std::next(iterator) != offenders.end()) {
          //           stream << ", ";
          //       }
          //   }
          //   stream << ", aborting due to strict error check";
          //   Logging::log(stream.str(), Logging::Level::Error);
          //   game.turn_number = Constants::get().MAX_TURNS;
          //   return;
          // }
        } else {
          // assert(offenders.empty());
        }
        break;
      }
      else {
        // for (auto player : offenders) {
        //   kill_player(player);
        //   commands.erase(player);
        // }
      }
    }

  }
  getCommandsMap(match: Match, commands: Array<Command>): Map<PlayerID, Array<HCommand>>  {
    let commandsMap: Map<PlayerID, Array<HCommand>> = new Map();
    let game = match.state.game;
    game.store.players.forEach((player: Player) => {
      if (!player.terminated) {
        commandsMap.set(player.id, []);
      }
    });
    //FIXME:
    loop:
    for (let i = 0; i < commands.length; i++) {
      let cmd = commands[i].command;
      let id = commands[i].agentID;
      if (commandsMap.has(id)) {
        let lastcmds = commandsMap.get(id);
        if (lastcmds.length) {
          let lastcmd = lastcmds[lastcmds.length - 1];
          // fill in the rest of the command data if needed
          switch (lastcmd.name) {
            case 'move':
              //@ts-ignore
              if (lastcmd.entity == null) {
                //@ts-ignore
                lastcmd.entity = parseInt(cmd);
                continue loop; // continue so we dont process cmd as a new command
              }
              //@ts-ignore
              else if (lastcmd.direction == null) {
                //@ts-ignore
                lastcmd.direction = Direction[cmd];
                continue loop;
              }
              break;
            case 'spawn':
              
              break;
            case 'construct':
              //@ts-ignore
              if (lastcmd.entity == null) {
                //@ts-ignore
                lastcmd.entity = parseInt(cmd);
                continue loop;
              }
              // otherwise this command is finished setting up
              break;
              
          }
        }
        // if we haven't continued the loop
        // proceed to process cmd as a new command
        let newcmd;
        switch(cmd) {
          case CommandName.Construct:
            newcmd = new ConstructCommand();
            break;
          case CommandName.Spawn:
            newcmd = new SpawnCommand();
            
            break;
          case CommandName.Move:
            newcmd = new MoveCommand();
            break;
          default:
            // this agent should be terminated
            match.throw(id, new MatchError(`Player - ${id} sent a erroneous command of ${cmd}. terminating player`));
            game.store.players.get(id).terminate();
            continue loop;
        }
        lastcmds.push(newcmd);
        commandsMap.set(id, lastcmds);
      }
      else {
        match.throw(id, new MatchError(`ID: ${id} is terminated and not existent anymore`));
      }
    }
    console.log('commandsmap', commandsMap);
    return commandsMap;
  }
  // in addition to halite 3 implementation, add condition for turn number
  gameEnded(match: Match): boolean {
    if (match.state.game.turn_number >= 10) {
      return true;
    }
    return false;
  }
  async getResults(match: Match, config?: any): Promise<any> {

  }
}