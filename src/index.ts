import { Design, Match, Command, MatchStatus, Agent, Logger, MatchError } from 'dimensions-ai';
import { constants } from './constants';

import { Command as HCommand, MoveCommand, ConstructCommand, SpawnCommand } from './command/Command';
import { Map as GameMap } from './model/Map';
import { Store } from './Store';
import { Player, PlayerID } from './model/Player';
import { Generator } from './mapgen/Generator';
import { Factory, Entity, EntityID } from './model/Entity';
import { Direction, Location } from './model/Location';
import { CommandName } from './command/CommandTransaction';
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
      player.energy = constants.INITIAL_ENERGY;

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
    let width = 32;
    let height = 32;
    let game = this.initializeGameState(match, width, height, numPlayers);
    let state: haliteState = {
      playerCount: match.agents.length,
      game: game
    }

    // TODO, store map width height and constants from map gen
    // send the raw constants
    match.sendAll(JSON.stringify(constants));
    
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
    /**
     * 0. First message is bot name, handle that first
     * make updates
     */
    

    // see if players/agents are ready
    let game: Game = match.state.game;

    if (game.turn_number === 0) {
      for (let i = 0; i < commands.length; i++) {
        match.log.info(`Player: ${commands[i].agentID} is ready | Name: ${commands[i].command}`);
      }
      match.log.info(`Player initialization complete`);
      game.turn_number++;
      return MatchStatus.RUNNING;
    }
    /**
     * 1.
     * 2. 
     * 3. 
     */
    // proceed to update match state according to halite 3
    else {
      
      match.log.info(`Starting turn ${game.turn_number}`);

      this.update_inspiration();

      this.processTurn(match, commands);
      
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
      // send changed cells TODO
      // send size of change first
      match.sendAll(`${game.store.changed_cells.size}`);
      game.store.changed_cells.forEach((location: Location)=> {
        // send x y energy
        match.sendAll(`${location.x} ${location.y} ${game.map.atLocation(location).energy}`);
      })
    //   for (const auto &[_, other_player] : game.store.players) {
    //     message_stream << other_player;
    //     // Output a list of entities.
    //     for (const auto &[entity_id, location] : other_player.entities) {
    //         const auto entity_iterator = game.store.entities.find(entity_id);
    //         message_stream << entity_id
    //                        << " " << location
    //                        << " " << entity_iterator->second.energy
    //                        << std::endl;
    //     }
    //     // Output a list of dropoffs.
    //     for (const auto &dropoff : other_player.dropoffs) {
    //         message_stream << dropoff << std::endl;
    //     }
    // }
    // // Send the changed cells.
    // message_stream << game.store.changed_cells.size() << std::endl;
    // for (const auto &location : game.store.changed_cells) {
    //     message_stream << location << " " << game.map.at(location).energy << std::endl;
    // }

      game.turn_number++;
      if (this.gameEnded(match)) {
        game.turn_number++;
        return MatchStatus.FINISHED;
      }

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

    // Process valid player commands, removing (terminating) players if they submit invalid ones.
    let changed_entities: Set<EntityID> = new Set();
    game.store.changed_cells.clear();

    // basically, first sort commands into a map of array of commands bunched appropriately due to only space delimeters
    // move: m {id} {dir}
    // construct: c {id}
    // spawn: g
    let commandsMap: Map<PlayerID, Array<HCommand>> = new Map();
    game.store.players.forEach((player: Player) => {
      if (!player.terminated) {
        commandsMap.set(player.id, []);
      }
    });
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
      }
      else {
        match.throw(id, new MatchError(`ID: ${id} is terminated and not existent anymore`));
      }
    }

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