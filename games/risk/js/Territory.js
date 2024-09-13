export class Territory {
  ctx;
  constructor(feature) {
    this.name = feature.properties.Name;
    this.coordinates = feature.geometry.coordinates;
    this.owner = null;
    this.troops = 0;
    this.path2D = new Path2D();
  }

  draw(ctx) {
    this.ctx = ctx;
    const path = new Path2D();
    this.coordinates[0].forEach((coord, index) => {
      const [x, y] = this.project(coord);
      if (index === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
    ctx.fillStyle = this.owner ? this.owner.color : 'lightgray';
    ctx.fill(path);
    ctx.stroke(path);
    this.path2D = path;
  }

  project([lon, lat]) {
    const x = (lon + 180) * (this.ctx.canvas.width / 130);
    const y = (90 - lat) * (this.ctx.canvas.height / 70);
    return [x, y];
  }

  isPointInside(x, y, ctx) {
    return ctx.isPointInPath(this.path2D, x, y);
  }
}