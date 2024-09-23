export class GameState {
  constructor() {
    this.players = [];
    this.phase = 'deployment'; // Other phases: 'attack', 'fortify'
    this.territories = [];
  }

  addTerritory(territory) {
    this.territories.push(territory);
  }
}