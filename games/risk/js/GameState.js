import { Player } from './Player.js';

export class GameState {
  constructor() {
    this.players = [];
    this.currentPlayerIndex = 0;
    this.phase = 'deployment'; // Other phases: 'attack', 'fortify'
    this.territories = [];
    this.initializePlayers();
  }

  initializePlayers() {
    const player1 = new Player('Player 1', 'red');
    const player2 = new Player('Player 2', 'blue');
    this.players.push(player1, player2);
  }

  addTerritory(territory) {
    this.territories.push(territory);
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  nextPlayer() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
    this.phase = 'deployment';
  }
}