import { Design, Match, Command, MatchStatus, Agent } from 'dimensions-ai';
import { constants } from './constants';
import { GameMap } from './gameMap';

type haliteState = {
  playerCount: number // should only be 2 or 4
  gameMap: GameMap
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
      gameMap: new GameMap(width, height)
    }
    match.agents.forEach((agent: Agent) => {
      state.gameMap.players.push({
        agent: agent,
        id: agent.id,
        shipyard: {
          x: 2,
          y: 2
        }
      })
    })

    match.state = state;

    match.sendAll(JSON.stringify(constants));
    
    match.agents.forEach((agent: Agent) => {
      match.send(`${match.state.playerCount} ${agent.id}`, agent);
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