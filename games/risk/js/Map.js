import { Territory } from './Territory.js';

export class Map {
  constructor(ctx, gameState) {
    this.ctx = ctx;
    this.gameState = gameState;
    this.territories = [];
  }
//   https://raw.githubusercontent.com/weolopez/airisk/f1f14e6a65fe95ba6a03c089621ea7bdb56ba06e/src/assets/output.json
  async loadGeoJSON(url) {
    const response = await fetch(url);
    const geoData = await response.json();
    this.parseGeoData(geoData);
  }

  parseGeoData(geoData) {
    geoData.features.forEach(feature => {
      const territory = new Territory(feature);
      this.territories.push(territory);
      this.gameState.addTerritory(territory);
    });
  }

  render() {
    this.territories.forEach(territory => {
      territory.draw(this.ctx);
    });
  }

  getTerritoryAtPoint(x, y) {
    return this.territories.find(territory => territory.isPointInside(x, y, this.ctx));
  }
}
