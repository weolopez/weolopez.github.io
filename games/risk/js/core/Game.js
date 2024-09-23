import { GameState } from './GameState.js';
import { Player } from './Player.js';

export class Game {
  constructor() {
    this.state = new GameState();
    this.players = [];
    this.currentPlayerIndex = 0;
    this.initializePlayers()
  }

  initializePlayers() {
    const player1 = new Player('Player 1', 'red');
    const player2 = new Player('Player 2', 'blue');
    this.players.push(player1, player2);
    this.state.players = this.players;
  }

  start() {
    this.initializePlayers();
    // Additional setup if needed
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.state.phase = 'deployment';
  }
}