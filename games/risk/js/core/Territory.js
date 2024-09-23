export class Territory {
  constructor(name, coordinates) {
    this.name = name;
    this.coordinates = coordinates; // In GeoJSON format
    this.owner = null;
    this.troops = 0;
    this.path2D = new Path2D();
  }

  // Existing methods...

  // New method to get bounding box
  getBoundingBox() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    this.coordinates.forEach(polygon => {
      polygon.forEach(coord => {
        const [x, y] = coord;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      });
    });

    return [minX, minY, maxX, maxY];
  }
}
