import { Territory } from '../core/Territory.js';
import { GeoJSONLoader } from './GeoJSONLoader.js';
import { project } from './Projection.js';

export class Map {
  constructor(ctx) {
    this.ctx = ctx;
    this.territories = [];
    this.scale = 1; // Initial zoom level
    this.offsetX = 0; // Initial x-offset for panning
    this.offsetY = 0; // Initial y-offset for panning
  }

  async load(geojsonPath) {
    const geoData = await GeoJSONLoader.load(geojsonPath);
    this.parseGeoData(geoData);
  }

  parseGeoData(geoData) {
    geoData.features.forEach(feature => {
      const name = feature.properties.NAME; // Use the NAME property
      const coordinates = feature.geometry.coordinates;
      const territory = new Territory(name, coordinates);
      this.territories.push(territory);
    });
  }

  render() {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Apply transformations
    ctx.setTransform(
      this.scale,
      0,
      0,
      this.scale,
      this.offsetX,
      this.offsetY
    );

    this.territories.forEach(territory => {
      this.drawTerritory(territory);
    });

    ctx.restore();
  }

  drawTerritory(territory) {
    const ctx = this.ctx;
    const path = new Path2D();
    const coordsArray = territory.coordinates;
  
    coordsArray.forEach(polygon => {
      polygon.forEach((coord, index) => {
        const [x, y] = project(coord, ctx.canvas.width, ctx.canvas.height);
        if (index === 0) path.moveTo(x, y);
        else path.lineTo(x, y);
      });
    });
  
    path.closePath();
    ctx.fillStyle = territory.owner ? territory.owner.color : 'lightgray';
    ctx.fill(path);
  
    // Adjust line width based on the current scale
    ctx.lineWidth = 1 / this.scale;
    ctx.strokeStyle = 'black';
    ctx.stroke(path);
  
    territory.path2D = path;
  }

  getTerritoryAtPoint(x, y) {
    const ctx = this.ctx;

    // Adjust the point based on current transformations
    const transformedX = (x - this.offsetX) / this.scale;
    const transformedY = (y - this.offsetY) / this.scale;

    return this.territories.find(territory =>
      ctx.isPointInPath(territory.path2D, transformedX, transformedY)
    );
  }

  // Method to zoom into a specific territory
      zoomToTerritory(territory, scale = null) {
      // Project the coordinates to the canvas coordinate system
      const projectedCoords = territory.coordinates.map(polygon =>
        polygon.map(coord => project(coord, this.ctx.canvas.width, this.ctx.canvas.height))
      );
    
      // Calculate bounding box of the projected coordinates
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      projectedCoords.forEach(polygon => {
        polygon.forEach(([x, y]) => {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        });
      });
    
      // Calculate new scale to fit the territory to the canvas
      const canvasWidth = this.ctx.canvas.width;
      const canvasHeight = this.ctx.canvas.height;
    
      const territoryWidth = maxX - minX;
      const territoryHeight = maxY - minY;
    
      const scaleX = canvasWidth / territoryWidth;
      const scaleY = canvasHeight / territoryHeight;
    
      // Choose the smaller scale to fit the territory
      const calculatedScale = Math.min(scaleX, scaleY) * 0.9; // 0.9 to add some padding
    
      // Use the provided scale or fall back to the calculated scale
      const finalScale = scale !== null ? scale : calculatedScale;
    
      // Ensure the new scale is not too small
      const minScale = 0.1; // Adjust this value as needed
      const adjustedScale = Math.max(finalScale, minScale);
    
      // Calculate new offsets to center the territory
      const newOffsetX = -minX * adjustedScale + (canvasWidth - territoryWidth * adjustedScale) / 2;
      const newOffsetY = -minY * adjustedScale + (canvasHeight - territoryHeight * adjustedScale) / 2;
    
      // Update scale and offsets
      this.scale = adjustedScale;
      this.offsetX = newOffsetX;
      this.offsetY = newOffsetY;
    
      // Re-render the map
      this.render();
    }
}
