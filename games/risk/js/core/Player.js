export class Player {
  constructor(name, color) {
    this.name = name;
    this.color = color;
    this.territories = [];
  }

  addTerritory(territory) {
    this.territories.push(territory);
  }

  removeTerritory(territory) {
    this.territories = this.territories.filter(t => t !== territory);
  }
}