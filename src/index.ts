import { Design, Match, Command, MatchStatus, Agent } from 'dimensions-ai';
import { constants } from './constants';

import { Map } from './model/Map';
import { Store } from './Store';
import { Player, PlayerID } from './model/Player';
import { Generator } from './mapgen/Generator';
import { Factory } from './model/Entity';

type haliteState = {
  playerCount: number // should only be 2 or 4
  game: {
    map: Map
    game_statistics?: any
    replay?: any
    logs?: any
    store: Store,
    turn_number: number
  }
}

export default class Halite4Design extends Design {
  
  initializeGameState(match: Match, width: number, height: number, numPlayers: number) {
    let map = new Map(width, height);
    console.log(map.grid[0][0]);
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
      // auto &factory = *factory_iterator++;
      // auto player = game.store.player_factory.make(factory, command);
      // player.energy = constants.INITIAL_ENERGY;
      // game.game_statistics.player_statistics.emplace_back(player.id, game.rng());
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
     * make updates
     * 1. send all agents turn number
     */


    return MatchStatus.RUNNING;
  }

  async getResults(match: Match, config?: any): Promise<any> {

  }
}