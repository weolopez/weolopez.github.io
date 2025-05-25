import { getRandomInt, shuffleArray } from '../utils/helpers.js';
import { roomThemes, themes } from '../utils/data.js';

export function placeMonsters(dungeon, monsterChance = 0.0001) {
  for (let y = 0; y < dungeon.length; y++) {
    for (let x = 0; x < dungeon[0].length; x++) {
      const cell = dungeon[y][x];
      if (cell.type === 'floor') {
        if (cell.theme !== null && !cell.monster) {
          if (Math.random() < monsterChance) {
            const theme = themes[cell.theme] ? cell.theme : 'default';
            const monsterPool = themes[theme].monsters;
            const randomMonster = monsterPool[getRandomInt(0, monsterPool.length - 1)];
            cell.monster = { ...randomMonster };
          }
        }
      }
    }
  }
}

export function interactWithCell(cell) {
  if (cell.monster) {
    console.log(`You encountered a ${cell.monster.name}!`);
    // Placeholder for combat logic
    if (cell.monster.behavior === 'aggressive') {
      console.log(`${cell.monster.name} attacks you!`);
    } else if (cell.monster.behavior === 'patrolling') {
      console.log(`${cell.monster.name} is patrolling.`);
    } else {
      console.log(`${cell.monster.name} seems uninterested in you.`);
    }
  }
}

export function generateDungeon(width, height, roomCount, roomMinSize, roomMaxSize) {
  const dungeon = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({
      type: 'wall',
      theme: null
    }))
  );

  function carveRoom(x1, y1, x2, y2, theme) {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        dungeon[y][x].type = 'floor';
        dungeon[y][x].theme = theme;
      }
    }
  }

  const rooms = [];
  const roomCenters = [];

  for (let i = 0; i < roomCount; i++) {
    const roomW = getRandomInt(roomMinSize, roomMaxSize);
    const roomH = getRandomInt(roomMinSize, roomMaxSize);

    const x = getRandomInt(1, width - roomW - 1);
    const y = getRandomInt(1, height - roomH - 1);

    const theme = roomThemes[getRandomInt(0, roomThemes.length - 1)];

    carveRoom(x, y, x + roomW - 1, y + roomH - 1, theme);

    const centerX = Math.floor(x + roomW / 2);
    const centerY = Math.floor(y + roomH / 2);
    rooms.push({ x1: x, y1: y, x2: x + roomW - 1, y2: y + roomH - 1, theme });
    roomCenters.push({ x: centerX, y: centerY });
  }

  shuffleArray(roomCenters);

  for (let i = 0; i < roomCenters.length - 1; i++) {
    const current = roomCenters[i];
    const next = roomCenters[i + 1];
    if (Math.random() < 0.2) {
      carveWindingCorridor(current.x, current.y, next.x, next.y);
    } else {
      carveLCorridor(current.x, current.y, next.x, next.y);
    }
  }

  placeDoors(rooms);

  corridorWidening();

  return dungeon;

  function carveLCorridor(x1, y1, x2, y2) {
    if (Math.random() < 0.5) {
      carveHorizontalCorridor(x1, x2, y1);
      carveVerticalCorridor(y1, y2, x2);
    } else {
      carveVerticalCorridor(y1, y2, x1);
      carveHorizontalCorridor(x1, x2, y2);
    }
  }

  function carveHorizontalCorridor(x1, x2, y) {
    const start = Math.min(x1, x2);
    const end = Math.max(x1, x2);
    for (let x = start; x <= end; x++) {
      dungeon[y][x].type = 'floor';
      if (dungeon[y][x].theme === null) {
        dungeon[y][x].theme = null;
      }
    }
  }

  function carveVerticalCorridor(y1, y2, x) {
    const start = Math.min(y1, y2);
    const end = Math.max(y1, y2);
    for (let y = start; y <= end; y++) {
      dungeon[y][x].type = 'floor';
      if (dungeon[y][x].theme === null) {
          dungeon[y][x].theme = null;
        }

    }
  }

  function carveWindingCorridor(x1, y1, x2, y2) {
    let x = x1;
    let y = y1;
    dungeon[y][x].type = 'floor';        
    if (dungeon[y][x].theme === null) {
      dungeon[y][x].theme = null;
    }

    while (x !== x2 || y !== y2) {
      if (Math.random() < 0.5) {
        if (x < x2) x++;
        else if (x > x2) x--;
      } else {
        if (y < y2) y++;
        else if (y > y2) y--;
      }
      if (Math.random() < 0.1) {
        if (Math.random() < 0.5 && x > 1 && x < width - 1) {
          x += Math.random() < 0.5 ? 1 : -1;
        } else if (y > 1 && y < height - 1) {
          y += Math.random() < 0.5 ? 1 : -1;
        }
      }
      dungeon[y][x].type = 'floor';        
      if (dungeon[y][x].theme === null) {
          dungeon[y][x].theme = null;
      }

    }
  }

  function placeDoors(roomList) {
    const doorChance = 0.3;
    for (const room of roomList) {
      for (let x = room.x1; x <= room.x2; x++) {
        maybePlaceDoor(x, room.y1 - 1, x, room.y1);
        maybePlaceDoor(x, room.y2 + 1, x, room.y2);
      }
      for (let y = room.y1; y <= room.y2; y++) {
        maybePlaceDoor(room.x1 - 1, y, room.x1, y);
        maybePlaceDoor(room.x2 + 1, y, room.x2, y);
      }
    }

    function maybePlaceDoor(corridorX, corridorY, roomX, roomY) {
      if (!inBounds(corridorX, corridorY) || !inBounds(roomX, roomY)) return;

      const corridorCell = dungeon[corridorY][corridorX];
      const roomCell = dungeon[roomY][roomX];

      if (
        corridorCell.type === 'floor' &&
        corridorCell.theme === null &&
        roomCell.type === 'floor' &&
        roomCell.theme !== null
      ) {
        if (Math.random() < doorChance) {
          corridorCell.type = 'door';
          corridorCell.theme = null;
        }
      }
    }
  }

  function corridorWidening() {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        if (dungeon[y][x].type === 'floor' && dungeon[y][x].theme === null) {
          if (Math.random() < 0.01) {
            if (dungeon[y][x + 1].type === 'wall') {
              dungeon[y][x + 1].type = 'floor';
              dungeon[y][x + 1].theme = null;
            }
            if (dungeon[y + 1][x].type === 'wall') {
              dungeon[y + 1][x].type = 'floor';
              dungeon[y + 1][x].theme = null;
            }
          }
        }
      }
    }
  }

  function inBounds(x, y) {
    return x >= 0 && x < width && y >= 0 && y < height;
  }
}