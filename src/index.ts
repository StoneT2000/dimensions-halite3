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
import { Energy } from './model/Units';
import { GameStatistics, PlayerStatistics } from './Statistics';

type haliteState = {
  playerCount: number // should only be 2 or 4
  game: Game
}
type Game = {
  map: GameMap
  game_statistics: GameStatistics
  replay?: any
  logs?: any
  store: Store,
  turn_number: number
}


export default class Halite3Design extends Design {
  
  // this emuluates the initialize_game section in HaliteImpl
  initializeGameState(match: Match, width: number, height: number, numPlayers: number) {
    let map = new GameMap(width, height);

    Generator.generateBasic(map, numPlayers);
    let store = new Store();
    let stats = new GameStatistics();
    let game = {
      map: map,
      turn_number: 0,
      store: store,
      game_statistics: stats
    };

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
      game.game_statistics.player_statistics.push(new PlayerStatistics(player.id, Math.floor(Math.random() * 1000)));

      // TODO: if given a snapshot, update values accordingly
      // if (snapshot.players.find(player.id) != snapshot.players.end()) {
      // }
      // store player into store
      store.players.set(player.id, player);
    }

    // game.replay.game_statistics = game.game_statistics;

    store.players.forEach((player: Player, playerID: PlayerID) => {
      // Zero the energy on factory and mark as owned.
      let factory = map.atLocation(player.factory);
      store.map_total_energy -= factory.energy;
      factory.energy = 0;
      factory.owner = playerID;
    });
    
    
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
    
    let game_constants = JSON.parse(JSON.stringify(Constants));
    Object.assign(game_constants, match.configs.initializeConfig);
    match.configs.game_constants = game_constants;
    match.log.info('Constants match.configs.game_constants');

    let width = game_constants.width ? game_constants.width : Constants.DEFAULT_MAP_WIDTH;
    let height = game_constants.height ? game_constants.height : Constants.DEFAULT_MAP_HEIGHT;
    let seed = game_constants.game_seed ? game_constants.game_seed : Constants.game_seed;

    let game = this.initializeGameState(match, width, height, numPlayers);
    let state: haliteState = {
      playerCount: match.agents.length,
      game: game
    }

    // TODO, store map width height and constants from map gen
    // send the raw constants
    match.sendAll(JSON.stringify(Constants));
    
    // Send the number of players and player ID
    game.store.players.forEach((player: Player) => {
      match.send(`${numPlayers} ${player.id}`, player.id);
    })
    // Send each player's ID and factory location
    game.store.players.forEach((player: Player) => {
      match.sendAll(`${player.id} ${player.factory.x} ${player.factory.y}`);
    })

    // Send map data, which is width height \n row by row each cells energy
    match.sendAll(`${width} ${height}`);

    // now we iterate through each row on the game map and output it all (each cell's energy)
    game.map.grid.forEach((rowOfCells) => {
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


    
    // Used to track the current turn number inside Event::update_stats
    game.game_statistics.turn_number = game.turn_number;
    match.log.info(`Starting turn ${game.turn_number}`);

    // see if players/agents are ready
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

    // instead of a for loop up to max turns, we check if game ended all the time
    if (this.gameEnded(match)) {
      game.turn_number++;

      game.game_statistics.number_turns = game.turn_number;

      // Add state of entities at end of game.
      // game.replay.full_frames.emplace_back();
      this.update_inspiration(match);
      // game.replay.full_frames.back().add_entities(game.store);
      this.update_player_stats(match);
      // game.replay.full_frames.back().add_end_state(game.store);

      // rank_players(); // sort by energy, then put firstplace as first, then sort by player id
      // sort by turns alive first
      game.game_statistics.player_statistics.sort((a, b) => {
        if (a.last_turn_alive == b.last_turn_alive) {
          let turn_to_compare = a.last_turn_alive;
          while(a.turn_productions[turn_to_compare] == b.turn_productions[turn_to_compare]) {
            if (--turn_to_compare < 0) {
              return a.random_id - b.random_id;
            }
          }
          return a.turn_productions[turn_to_compare] - b.turn_productions[turn_to_compare]
        }
        else {
          return a.last_turn_alive - b.last_turn_alive
        }
      })
      game.game_statistics.player_statistics.reverse();
      game.game_statistics.player_statistics.sort((a, b) => {
        return a.player_id - b.player_id;
      })
      game.game_statistics.player_statistics.forEach((stat, index) => {
        stat.rank = index + 1;
      })
      console.log(game.game_statistics);
      match.log.info('Game has ended');
      return MatchStatus.FINISHED;
    }
    return MatchStatus.RUNNING;

    
  }
  update_inspiration(match: Match) {
    if (!Constants.INSPIRATION_ENABLED) {
      return;
    }
    let game: Game = match.state.game;
    const inspiration_radius = Constants.INSPIRATION_RADIUS;
    const ships_threshold = Constants.INSPIRATION_SHIP_COUNT;

    // Check every ship of every player
    game.store.players.forEach((player, player_id) => {
      player.entities.forEach((location, entity_id) => {
        // map from player ID to # of ships within the inspiration
        // radius of the current ship
        let ships_in_radius: Map<PlayerID, number> = new Map();
        game.store.players.forEach((_, pid) => {
          ships_in_radius.set(pid, 0);
        });

        // Explore locations around this ship
        for (let dx = -inspiration_radius; dx <= inspiration_radius; dx++) {
          for (let dy = -inspiration_radius; dy <= inspiration_radius; dy++) {
            let cur = new Location(
              (((location.x + dx) % game.map.width) + game.map.width) % game.map.width,
              (((location.y + dy) % game.map.height) + game.map.height) % game.map.height
            )
            let cur_cell = game.map.atLocation(cur);
            if (cur_cell.entity == null || 
              game.map.distance(location, cur) > inspiration_radius) {
              continue;
            }
            const other_entity = game.store.get_entity(cur_cell.entity);
            let oldval = ships_in_radius.get(other_entity.owner);
            ships_in_radius.set(other_entity.owner, oldval + 1);
          }
        }

        // Total up ships of other player
        let opponent_entities = 0;
        ships_in_radius.forEach((count, pid) => {
          if (pid != player_id) {
            opponent_entities += count;
          }
        })
        // Mark ship as inspired or not
        let entity = game.store.get_entity(entity_id);
        entity.is_inspired = opponent_entities >= ships_threshold;

      });
    });
        
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
      let transaction = new CommandTransaction(game.store, game.map, match);
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
        console.log(' Changed entities', game.store.changed_entities);
        console.log('changed cells', game.store.changed_cells);

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

    // Resolve ship mining

    const max_energy = Constants.MAX_ENERGY;
    const ships_threshold = Constants.SHIPS_ABOVE_FOR_CAPTURE;
    const bonus_multiplier = Constants.INSPIRED_BONUS_MULTIPLIER;
    game.store.entities.forEach((entity, entity_id) => {
      //changed_entities.find(entity_id) == changed_entities.end() is equiv to checking if it exists
      if (!game.store.changed_entities.has(entity_id) && entity.energy < max_energy) {
        // Allow this entity to extract
        const location = game.store.get_player(entity.owner).get_entity_location(entity_id);
        let cell = game.map.atLocation(location);
        const ratio = entity.is_inspired ? Constants.INSPIRED_EXTRACT_RATIO : Constants.EXTRACT_RATIO;
        let extracted: Energy = Math.ceil(cell.energy / ratio);
        let gained = extracted;
        // If energy is small, give it all to the entity.
        if (extracted == 0 && cell.energy > 0) {
          extracted = cell.energy;
          gained = cell.energy;
        }
        // Don't take more than the entity can hold.
        if (extracted + entity.energy > max_energy) {
          extracted = max_energy - entity.energy;
        }

        // Apply bonus for inspired entities
        if (entity.is_inspired && bonus_multiplier > 0) {
          gained += bonus_multiplier * gained;
        }

        // Do not allow entity to exceed capacity.
        if (max_energy - entity.energy < gained) {
          gained = max_energy - entity.energy;
        }

        // auto player_stats = game.game_statistics.player_statistics.at(entity.owner.value);
        // player_stats.total_mined += extracted;
        // player_stats.total_bonus += gained > extracted ? gained - extracted : 0;
        // if (entity.was_captured) {
        //     player_stats.total_mined_from_captured += gained;
        // }
        entity.energy += gained;
        cell.energy -= extracted;
        game.store.map_total_energy -= extracted;
        game.store.changed_cells.add(location);
      }
    });

    // Resolve ship capture
    if (Constants.CAPTURE_ENABLED) {
      // not implementing because default constants set this to false anyway
    }

    this.update_player_stats(match);
  }
  getCommandsMap(match: Match, commands: Array<Command>): Map<PlayerID, Array<HCommand>>  {
    let commandsMap: Map<PlayerID, Array<HCommand>> = new Map();
    let game: Game = match.state.game;
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
                lastcmd.direction = cmd;
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
            this.kill_player(match, id);
            continue loop;
        }
        lastcmds.push(newcmd);
        commandsMap.set(id, lastcmds);
      }
      else {
        // this branch occurs if we some how receive commands from an agent we marked as terminated
        // match.throw(id, new MatchError(`ID: ${id} is terminated and not existent anymore`));
      }
    }
    return commandsMap;
  }
  // in addition to halite 3 implementation, add condition for turn number
  gameEnded(match: Match): boolean {
    if (match.state.game.turn_number >= Constants.MAX_TURNS) {
      return true;
    }
    return false;
  }
  /**
   * Updates player stats
   */
  update_player_stats(match: Match) {
    let statistics: GameStatistics = match.state.game.game_statistics;
  }

  /**
   * Kills/Terminates a player from the match
   * @param match 
   * @param player_id 
   */
  kill_player(match: Match, player_id: PlayerID) {
    let game: Game = match.state.game;
    let player = game.store.players.get(player_id)
    player.terminate();
    // match.kill(player_id); TODO add this later
    let entities = player.entities;
    entities.forEach((location, entity_id) => {
      let cell = game.map.atLocation(location);
      cell.entity = null;
      game.store.delete_entity(entity_id);
    });
    player.energy = 0;
  }
  async getResults(match: Match, config?: any): Promise<any> {
    let game: Game = match.state.game;
    let results = {
      error_logs: {
      },
      execution_time: {

      },
      final_snapshot: {

      },
      map_generator: {
        
      },
      map_seed: Constants.game_seed,
      map_width: game.map.width,
      map_height: game.map.height,
      replay: '',
      stats: {

      },
      terminated: {

      }
    }
    if (match.configs.initializeConfig.game_seed != undefined) {
      results.map_seed = match.configs.initializeConfig.game_seed;
    }

    let rankings = [];
    game.store.players.forEach((player: Player) => {
      rankings.push({
        id: player.id,
        score: player.energy
      });
    });
    rankings.sort((a, b) => a.score - b.score);
    rankings.forEach((meta: any, index) => {
      results.stats[meta.id] = {
        rank: index + 1,
        score: meta.score
      }
    });

    return results;
  }
}