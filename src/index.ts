import { Design, Match, Command, MatchStatus, Agent } from 'dimensions-ai';
import { constants } from './constants';

import { Map } from './model/Map';
import { Store } from './Store';
import { Player } from './model/Player';

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
  
  async initialize(match: Match) {
    /**
     * 0. NOTE, delimiter is commonly a ' ' (space)
     * 1. sendall raw constants √
     * 2. send number of players and the agent's ID √
     * 3. send all players each agent's id, then starting shipyard location √
     * 4. Send all players width height
     *    then row by row the map with halite info
     */

    let width = 32;
    let height = 32;
    let state: haliteState = {
      playerCount: match.agents.length,
      game: {
        map: new Map(width, height),
        turn_number: 0,
        store: new Store()
      }
    }
    // TODO, store map width height and constants from map gen
    // send the raw constants
    match.sendAll(JSON.stringify(constants));
    
    state.game.store.players.forEach((player: Player) => {
      
    })
    match.agents.forEach((agent: Agent) => {
      match.send(`${state.game.store.players.size} ${agent.id}`, agent);
    });

    match.state.gameMap.players.forEach((player) => {
      // player.id is the same as the same agent's agent.id or same as player.agent.id
      match.sendAll(`${player.id} ${player.shipyard.x} ${player.shipyard.y}`);
    });

    // Send map data
    match.sendAll(`${width} ${height}`);

    // now we iterate through each row on the gameMap and output it all (each y)
    match.state.gameMap.map.forEach((row) => {
      match.sendAll(row.join(' '));
    })


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