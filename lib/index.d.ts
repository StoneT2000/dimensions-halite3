import { Design, Match, Command, MatchStatus } from 'dimensions-ai';
export default class Halite4Design extends Design {
    initialize(match: Match): Promise<void>;
    update(match: Match, commands: Array<Command>): Promise<MatchStatus>;
    getResults(match: Match, config?: any): Promise<any>;
}
