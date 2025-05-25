export function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function findRandomFloorLocation(dungeon) {
    let x, y;
    do {
      x = Math.floor(Math.random() * dungeon[0].length);
      y = Math.floor(Math.random() * dungeon.length);
    } while (dungeon[y][x].type !== "floor");
    return { x, y };
}