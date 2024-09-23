export function project([lon, lat], canvasWidth, canvasHeight) {
  // Simple Mercator projection
  const x = (lon + 180) * (canvasWidth / 360);
  const y = (90 - lat) * (canvasHeight / 180);
  return [x, y];
}
