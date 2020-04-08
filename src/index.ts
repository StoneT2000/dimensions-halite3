import { Design, Match, Agent, MatchError, DesignOptions, MatchEngine, Tournament} from 'dimensions-ai';
import { Constants } from './Constants';

import EngineOptions = MatchEngine.EngineOptions;
import COMMAND_FINISH_POLICIES = MatchEngine.COMMAND_FINISH_POLICIES;
import COMMAND_STREAM_TYPE = MatchEngine.COMMAND_STREAM_TYPE;
import Command = MatchEngine.Command;

import { Command as HCommand, MoveCommand, ConstructCommand, SpawnCommand } from './command/Command';
import { Map as GameMap } from './model/Map';
import { Store } from './Store';
import { Player, PlayerID } from './model/Player';
import { MapParameters, MapType } from './mapgen/GeneratorBase';
import { MapGenerator } from './mapgen/MapGenerator';
import { Factory, Entity, EntityID } from './model/Entity';
import { Direction, Location } from './model/Location';
import { CommandName, CommandTransaction } from './command/CommandTransaction';
import { Dropoff } from './model/Dropoff';
import { Energy } from './model/Units';
import { GameStatistics, PlayerStatistics } from './Statistics';
import { GameEvent } from './replay/GameEvent';
import { Replay, Turn } from './replay/Replay';

import MersenneTwister from 'mersenne-twister';
import { DeepPartial } from 'dimensions-ai/lib/utils/DeepPartial';
import { deepMerge } from 'dimensions-ai/lib/utils/DeepMerge';

interface haliteState {
  playerCount: number // should only be 2 or 4
  game: Game,
  startTime?: any
}
interface Game {
  map: GameMap
  game_statistics: GameStatistics
  replay: Replay
  logs?: any
  store: Store,
  turn_number: number,
}
interface HaliteResults {
  error_logs: any
  execution_time: number
  final_snapshot: any
  map_generator: any
  map_seed: number
  map_width: number
  map_height: number
  replay: string
  stats: {
    [K in string]: {
      score: number
      rank: number
    }
  }
  terminated: any
}


export default class Halite3Design extends Design {
  public DEFAULT_OPTIONS: DeepPartial<DesignOptions> = {
    engineOptions: {
      commandDelimiter: ' ',
      commandFinishPolicy: COMMAND_FINISH_POLICIES.LINE_COUNT,
      commandLines: {
        max: 1
      },
      timeout: {
        active: true,
        max: 10000,
        timeoutCallback: (agent: Agent, match: Match, engineOptions: EngineOptions) => {
          // match.kill(agent.id);
          agent.currentMoveCommands = [];
          this.kill_player(match, agent.id);
          let game: Game = match.state.game;
          let player = game.store.get_player(agent.id);
          match.log.error(`agent ${agent.id} - '${player.name}' timed out after ${engineOptions.timeout.max} ms`);
        }
      }
    }
  }
  constructor(name: string, options: DeepPartial<DesignOptions> = {}) {

    super(name, options);
    let overriden_defaults = {...this.DEFAULT_OPTIONS};
    deepMerge(this.designOptions, overriden_defaults); 
    deepMerge(this.designOptions, options);
  }
  // this emuluates the initialize_game section in HaliteImpl
  initializeGameState(match: Match, map_parameters: MapParameters) {
    let map = new GameMap(map_parameters.width, map_parameters.height);

    MapGenerator.generateWithParams(map, map_parameters);
    let store = new Store();
    let stats = new GameStatistics();
    let replay = new Replay(stats, map_parameters.numPlayers, map_parameters.seed, map);
    match.log.info("Map seed is " + map_parameters.seed + " | Map Type is" + map_parameters.type);
    let game = {
      map: map,
      turn_number: 0,
      store: store,
      game_statistics: stats,
      replay: replay
    };

    // load map total halite
    for (let row = 0; row < map.height; row++) {
      for (let col = 0; col < map.width; col++) {
          stats.map_total_halite += map.at(row, col).energy;
      }
    }

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
     * Load the map from the snapshot (if provided in configs or cli)
     */
    
    let numPlayers = match.agents.length;
    
    let game_constants = JSON.parse(JSON.stringify(Constants));
    
    

    // set the random seed
    let seed = match.configs.initializeConfig.seed ? 
      match.configs.initializeConfig.seed : Math.floor((new Date).getTime() / 1000);
    // use the seed to determine default map size
    let rng = new MersenneTwister(seed);
    let map_sizes = [32, 40, 48, 56, 64];
    let base_size = map_sizes[rng.random_int() % map_sizes.length]
    game_constants.DEFAULT_MAP_HEIGHT = base_size;
    game_constants.DEFAULT_MAP_WIDTH = base_size;

    Object.assign(game_constants, match.configs.initializeConfig);
    match.configs.game_constants = game_constants;
    match.configs.game_constants.seed = seed;

    // set some defaults
    match.configs.no_replay = false;


    let width = game_constants.width ? game_constants.width : game_constants.DEFAULT_MAP_WIDTH;
    let height = game_constants.height ? game_constants.height : game_constants.DEFAULT_MAP_HEIGHT;
    
    let map_type = game_constants.map_type ? game_constants.map_type : MapType.Fractal

    let map_parameters: MapParameters = {
      type: map_type,
      seed: seed,
      width: width,
      height: height,
      numPlayers: numPlayers
    }

  
    let game = this.initializeGameState(match, map_parameters);
    let state: haliteState = {
      playerCount: match.agents.length,
      game: game,
      startTime: new Date(),
    }
    let turns = Constants.MIN_TURNS;
    const max_dimension = Math.max(game.map.width, game.map.height);
    if (max_dimension > Constants.MIN_TURN_THRESHOLD) {
        turns += (((max_dimension - Constants.MIN_TURN_THRESHOLD) / (Constants.MAX_TURN_THRESHOLD - Constants.MIN_TURN_THRESHOLD)) * (Constants.MAX_TURNS - Constants.MIN_TURNS));
    }
    match.configs.game_constants.MAX_TURNS = turns;

    match.log.detail(`Map Parameters:`, map_parameters)
    match.log.detail(`Game Constants:`, match.configs.game_constants)

    // Add a 0 frame so we can record beginning-of-game state
    game.replay.full_frames.push(new Turn());


    game.replay.game_statistics = game.game_statistics; // ?? why? HaliteImpl.cpp:84

    // TODO, store map width height and constants from map gen
    // send the raw constants
    match.sendAll(JSON.stringify(match.configs.game_constants));
    
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
  async update(match: Match, commands: Array<Command>): Promise<Match.Status> {
 
    let game: Game = match.state.game;
    // essentially keep skipping the actual running of the match until we receive commands
    if (game.turn_number == 0 && commands.length == 0) {
      return Match.Status.RUNNING;
    }
    
    // Used to track the current turn number inside Event::update_stats
    game.game_statistics.turn_number = game.turn_number;
    match.log.detail(`Starting turn ${game.turn_number}`);

    // see if players/agents are ready
    if (game.turn_number == 0) {
      let names = new Map();
      for (let i = 0; i < commands.length; i++) {
        if (names.has(commands[i].agentID)) {
          names.set(commands[i].agentID, names.get(commands[i].agentID) + ' ' + commands[i].command);
        }
        else {
          names.set(commands[i].agentID, commands[i].command);
        }
      }
      names.forEach((name, player_id) => {
        match.log.info(`Player: ${player_id} is ready | Name: ${name}`);
        game.store.get_player(player_id).name = name;
        // insert the initial player states
        
      })
      game.store.players.forEach((player, player_id) => {
        game.replay.players.set(player_id, player);
      })
      match.log.info(`Player initialization complete`);

      // change timeout options of engine after "turn 0" as initialization bots have 10 seconds
      match.matchEngine.setEngineOptions({
        timeout: {
          max: 2000
        }
      })
    }

    

    /** Updating stage. Halite does it by sending updated frame data to each agent, and then processing their commands and advancing the turn. We will process commands first (empty at first), send updated frames return MatchStatus.RUNNING, then back to process commands 
     * 1. Process turn, update match state
     * 2. Send new match state to agents
     * 3. 
     */
    // don't process turn 0 as it is anomaly as it is onyl turn when bot sends its name and not commands
    if (game.turn_number != 0) {
      // Create new turn struct for replay file, to be filled by further turn actions
      game.replay.full_frames.push(new Turn());
      let len = game.replay.full_frames.length;
      // Add state of entities at start of turn.
      // First, update inspiration flags, so they can be used for
      // movement/mining and so they are part of the replay.
      this.update_inspiration(match);
      game.replay.full_frames[len - 1].add_entities(game.store);

      this.processTurn(match, commands);

      // Add end of frame state.
      game.replay.full_frames[len - 1].add_end_state(game.store);
    }
    game.turn_number++;
    // Used to track the current turn number inside Event::update_stats
    game.game_statistics.turn_number = game.turn_number;


    /**
     * Sending changed data to all players. In halite, I believe this was run at the start of this.processTurn
     * Moving here should be fine as updating replays doesn't affect this
     */
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
      game.replay.full_frames.push(new Turn());
      let len = game.replay.full_frames.length;
      this.update_inspiration(match);
      game.replay.full_frames[len - 1].add_entities(game.store);
      this.update_player_stats(match);
      game.replay.full_frames[len - 1].add_end_state(game.store);

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
      });
      game.game_statistics.player_statistics.reverse();
      game.game_statistics.player_statistics.forEach((stat, index) => {
        stat.rank = index + 1;
      });
      game.game_statistics.player_statistics.sort((a, b) => {
        return a.player_id - b.player_id;
      });
      
      match.log.info('Game has ended');

      let enable_compression = false;;
      let replay = game.replay;
      let filename = `replay-${(new Date()).toISOString()}-${replay.map_generator_seed}-${game.map.width}-${game.map.height}.hlt`;
      let replay_directory = match.configs.replayDirectory ? match.configs.replayDirectory : '.';
      let output_filename = replay_directory + '/' + filename;
      // store replay
      if (!match.configs.no_replay) {
        replay.output(output_filename, enable_compression);
      }

      // log the execution time
      //@ts-ignore
      game.game_statistics.execution_time = new Date() - match.state.startTime;

      return Match.Status.FINISHED;
    }
    return Match.Status.RUNNING;

    
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
            let oldval = 0;
            if (ships_in_radius.has(other_entity.owner)) { ships_in_radius.get(other_entity.owner); }
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
      let transaction = new CommandTransaction(game.store, game.map, match, (event: GameEvent) => {
        event.update_stats(game.store, game.map, game.game_statistics);
        // Create new game event for replay file.
        game.replay.full_frames[game.replay.full_frames.length - 1].events.push(event);
      });

      // std::unordered_set<Player::id_type> offenders;
      let offenders = new Set();

      // // TODO: missing error handler
      // transaction.on_error([&offenders, &commands, this](CommandError error) {
      //   this->handle_error(offenders, commands, std::move(error));
      // });

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

        if (Constants.STRICT_ERRORS) {
          // TODO?
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
        let len = game.replay.full_frames.length;
        game.replay.full_frames[len - 1].moves = commandsMap;
        break;
      }
      else {
        // TODO
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

        let player_stats = game.game_statistics.player_statistics[entity.owner];
        player_stats.total_mined += extracted;
        player_stats.total_bonus += gained > extracted ? gained - extracted : 0;
        if (entity.was_captured) {
          player_stats.total_mined_from_captured += gained;
        }
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
    let len = game.replay.full_frames.length;
    game.replay.full_frames[len - 1].add_cells(game.map, game.store.changed_cells);
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
    if (match.state.game.turn_number > match.configs.game_constants.MAX_TURNS) {
      return true;
    }
    else {
      // if match ends for other reasons
      let game: Game = match.state.game;

      if (game.store.map_total_energy == 0) {
        // check if map is empty of energy
        let unplayable = true;
        game.store.entities.forEach((entity) =>{
          if (unplayable && entity.energy != 0) {
            unplayable = false;
          }
        });
        return unplayable;

      }
      let num_alive_players = 0;
      game.store.players.forEach((player, player_id) => {
        let can_play = this.player_can_play(player);
        if (!player.terminated && player.can_play && !can_play) {
          match.log.warn(`Player ${player.id} has insufficient resources to continue`);
          player.can_play = false;
          // Update 'last turn alive' one last time (liveness lasts
          // to the end of a turn in which player makes a valid move)
          let stats = game.game_statistics.player_statistics[player_id];
          stats.last_turn_alive = game.turn_number;
        }
        if (!player.terminated && can_play) {
          num_alive_players++;
        }
      });
      if (num_alive_players > 1) {
        return false;
      }
      // If there is only one player in the game, then let them keep playing.
      return !(game.store.players.size == 1 && num_alive_players == 1);
    }
    return false;
  }
  /**
   * Updates player stats
   */
  update_player_stats(match: Match) {
    let statistics: GameStatistics = match.state.game.game_statistics;
    let game: Game = match.state.game;
    game.game_statistics.player_statistics.forEach((player_stats) => {
      // Player with sprites is still alive, so mark as alive on this turn and add production gained
      const player_id = player_stats.player_id;
      const player = game.store.get_player(player_id);
      if (!player.terminated && player.can_play) {
        if (this.player_can_play(player)) { // Player may have died during this turn, in which case do not update final turn
          player_stats.last_turn_alive = game.turn_number;
          
          // Calculate carried_at_end
          player_stats.carried_at_end = 0;
          player.entities.forEach((location, _entity_id) => {
            player_stats.carried_at_end += game.store.get_entity(_entity_id).energy;
          });
        }
        player_stats.turn_productions.push(player.energy);
        player_stats.turn_deposited.push(player.total_energy_deposited);
        player_stats.number_dropoffs = player.dropoffs.length;
        // player_stats.ships_peak = std::max(player_stats.ships_peak, (long)player.entities.size());
        player_stats.ships_peak = Math.max(player_stats.ships_peak, player.entities.size);
        player.entities.forEach((location, _entity_id) => {
          const entity_distance = game.map.distance(location, player.factory);
          if (entity_distance > player_stats.max_entity_distance)
              player_stats.max_entity_distance = entity_distance;
          player_stats.total_distance += entity_distance;
          player_stats.total_entity_lifespan++;
          if (this.possible_interaction(player_id, location, match)) {
              player_stats.interaction_opportunities++;
          }
        });
        player_stats.halite_per_dropoff.set(player.factory, player.factory_energy_deposited);
        player_stats.total_production = player.total_energy_deposited;
        player.dropoffs.forEach((dropoff) => {
            player_stats.halite_per_dropoff.set(dropoff.location, dropoff.deposited_halite);
        })

      } else {
        player_stats.turn_productions.push(0);
        player_stats.turn_deposited.push(0);
      }
    });
  }

  /**
   * Determine if entity owned by given player is in range of another player (their entity, dropoff, or factory) and thus may interact
   *
   * param owner_id Id of owner of entity at given location
   * param entity_location Location of entity we are assessing for an interaction opportunity
   * return truthy Indicator of whether there players are in close range for an interaction (true) or not (false)
   */
  possible_interaction(owner_id: PlayerID, entity_location: Location, match: Match): boolean {
    let game: Game = match.state.game;
    // Fetch all locations 2 cells away
    let close_cells: Set<Location> = new Set();
    const neighbors = game.map.get_neighbors(entity_location);
    // close_cells.insert(neighbors.begin(), neighbors.end());
    close_cells = new Set(neighbors);
    neighbors.forEach((neighbor) => {
      const cells_once_removed = game.map.get_neighbors(neighbor);
      // close_cells.insert(cells_once_removed.begin(), cells_once_removed.end());
      cells_once_removed.forEach((location) => {
        close_cells.add(location)
      })
    });

    // Interaction possibilty implies a cell has an entity owned by another player or there is a factory or dropoff
    // of another player on the cell. Interactions between entities of a single player are ignored
    close_cells.forEach((cell_location) => {
      const cell = game.map.atLocation(cell_location);
      if (cell.entity != null) {
        if (game.store.get_entity(cell.entity).owner != owner_id) return true;
      }
      if (cell.owner != null && cell.owner != owner_id) return true;
    });
    return false;
  }

  /**
   * Determine whether a player can still play in the future
   *
   * @param player Player to check
   * @return True if the player can play on the next turn
   */
  player_can_play(player: Player) {
    return player.entities.size || player.energy >= Constants.NEW_ENTITY_ENERGY_COST;
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
    match.kill(player_id);
    let entities = player.entities;
    entities.forEach((location, entity_id) => {

      let cell = game.map.atLocation(location);
      cell.entity = null;
      game.store.delete_entity(entity_id);
      entities.delete(entity_id);
    });
    player.entities = new Map();
    player.energy = 0;
  }

  async getResults(match: Match): Promise<HaliteResults> {
    let game: Game = match.state.game;
    let results = {
      error_logs: {
      },
      execution_time: game.game_statistics.execution_time,
      final_snapshot: {

      },
      map_generator: {
        
      },
      map_seed: match.configs.game_constants.seed,
      map_width: game.map.width,
      map_height: game.map.height,
      replay: match.configs.replayDirectory,
      stats: {

      },
      terminated: {

      }
    }
    if (match.configs.initializeConfig.game_seed != undefined) {
      results.map_seed = match.configs.game_constants.seed;
    }
    game.game_statistics.player_statistics.forEach((stat) => {
      results.stats[stat.player_id] = {
        score: stat.turn_productions[stat.turn_productions.length - 1],
        rank: stat.rank
      }
    })

    return results;
  }
  static winLossResultHandler(results: HaliteResults): Tournament.RANK_SYSTEM.WINS.Results {
    let winners = [];
    let losers =[];
    let ties = [];
    for (let player_id in results.stats) {
      if (results.stats[player_id].rank != 1) {
        losers.push(parseInt(player_id));
      }
      else {
        winners.push(parseInt(player_id));
      }
    }
    return {winners: winners, losers: losers, ties: ties};
  }
  static trueskillResultHandler(results: HaliteResults): Tournament.RANK_SYSTEM.TRUESKILL.Results {
    let rankings = [];
    for (let player_id in results.stats) {
      rankings.push({rank: results.stats[player_id].rank, agentID: parseInt(player_id)});
    }
    return {ranks: rankings}
  }
}