  /**
 * @typedef {Object} DungeonCell
 * @property {string} type - The type of cell ('wall', 'floor', 'door').
 * @property {string|null} theme - Room theme (e.g., 'library', 'armory').
 * @property {boolean} explored - If the player has explored this cell.
 * @property {boolean} visible - If the player can currently see this cell.
 * @property {Monster|null} monster - Monster object if present, otherwise null.
 */

  // For demonstration, color-code floors by their theme
  const themeColors = {
    library: '#d4c99d',
    armory: '#c9d4a3',
    'dining hall': '#d4b0b0',
    prison: '#bcc2d4',
    storeroom: '#dcd4b0',
    defaultCorridor: '#e8e8e8',
    door: '#663300',
    wall: '#333333',
    'Indoor Jungle': '#00ff00'
    };

    // Extract room themes from themeColors keys
    const roomThemes = Object.keys(themeColors).filter(theme => theme !== 'defaultCorridor' && theme !== 'door' && theme !== 'wall');
/**
 * @typedef {Object} Monster
 * @property {string} name - Monster's name (e.g., 'Goblin', 'Skeleton').
 * @property {number} health - Monster's health points.
 * @property {number} attack - Monster's attack power.
 * @property {string} behavior - Behavior type ('aggressive', 'passive', 'patrolling').
 */
const monsterPool = [
  { name: 'Goblin', health: 10, attack: 2, behavior: 'aggressive' },
  { name: 'Skeleton', health: 15, attack: 3, behavior: 'patrolling' },
  { name: 'Orc', health: 25, attack: 5, behavior: 'aggressive' },
  { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
];
/**
 * @typedef {Object} DungeonCell
 * @property {string} type - The type of cell ('wall', 'floor', 'door').
 * @property {string|null} theme - Room theme (e.g., 'library', 'armory').
 * @property {boolean} explored - If the player has explored this cell.
 * @property {boolean} visible - If the player can currently see this cell.
 * @property {Monster|null} monster - Monster object if present, otherwise null.
 */

/**
 * @typedef {Object} Monster
 * @property {string} name - Monster's name (e.g., 'Goblin', 'Skeleton').
 * @property {number} health - Monster's health points.
 * @property {number} attack - Monster's attack power.
 * @property {string} behavior - Behavior type ('aggressive', 'passive', 'patrolling').
 */

const themes = {
  library: {
    color: '#d4c99d',
    monsters: [
      { name: 'Book Golem', health: 20, attack: 4, behavior: 'aggressive' },
      { name: 'Librarian Ghost', health: 15, attack: 3, behavior: 'patrolling' }
    ]
  },
  armory: {
    color: '#c9d4a3',
    monsters: [
      { name: 'Armored Knight', health: 30, attack: 6, behavior: 'aggressive' },
      { name: 'Guard Dog', health: 10, attack: 2, behavior: 'aggressive' }
    ]
  },
  'dining hall': {
    color: '#d4b0b0',
    monsters: [
      { name: 'Chef', health: 15, attack: 3, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  },
  prison: {
    color: '#bcc2d4',
    monsters: [
      { name: 'Prisoner', health: 10, attack: 2, behavior: 'aggressive' },
      { name: 'Guard', health: 20, attack: 4, behavior: 'patrolling' }
    ]
  },
  storeroom: {
    color: '#dcd4b0',
    monsters: [
      { name: 'Mimic', health: 25, attack: 5, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  },
  'Indoor Jungle': {
    color: '#00ff00',
    monsters: [
      { name: 'Snake', health: 10, attack: 3, behavior: 'aggressive' },
      { name: 'Spider', health: 8, attack: 2, behavior: 'aggressive' }
    ]
  },
  default: {
    color: '#e8e8e8',
    monsters: [
      { name: 'Goblin', health: 10, attack: 2, behavior: 'aggressive' },
      { name: 'Skeleton', health: 15, attack: 3, behavior: 'patrolling' },
      { name: 'Orc', health: 25, attack: 5, behavior: 'aggressive' },
      { name: 'Rat', health: 5, attack: 1, behavior: 'passive' }
    ]
  }
};

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function placeMonsters(dungeon, monsterChance = 0.0001) {
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
/**
 * Handle player interacting with a cell (e.g., moving onto it).
 */
function interactWithCell(cell) {
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

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 */
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * In-place array shuffle (Fisher–Yates).
   */
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  /**
   * Generate a random dungeon using rooms and corridors, 
   * with improved features:
   *  - Themed rooms
   *  - Random corridor shapes (L-shaped or winding)
   *  - Doors
   *  - Post-processing pass for corridor widening
   *
   * @param {number} width        - Width of the dungeon in cells (columns).
   * @param {number} height       - Height of the dungeon in cells (rows).
   * @param {number} roomCount    - Number of rooms to place.
   * @param {number} roomMinSize  - Minimum dimension (width/height) of a room.
   * @param {number} roomMaxSize  - Maximum dimension (width/height) of a room.
   * @returns {{type: string, theme: string|null}[][]} 
   *    2D array representing the dungeon, where each cell is an object:
   *    {
   *      type: 'wall' | 'floor' | 'door',
   *      theme: string | null   // e.g., 'library', 'armory', or null for corridor
   *    }
   */
  function generateDungeon(width, height, roomCount, roomMinSize, roomMaxSize) {
    // 1. Initialize the dungeon with walls
    const dungeon = Array.from({ length: height }, () =>
      Array.from({ length: width }, () => ({
        type: 'wall',
        theme: null
      }))
    );
  
    // Helper: Carve out a rectangular area with a specific theme
    function carveRoom(x1, y1, x2, y2, theme) {
      for (let y = y1; y <= y2; y++) {
        for (let x = x1; x <= x2; x++) {
          dungeon[y][x].type = 'floor';
          dungeon[y][x].theme = theme;
        }
      }
    }
  
    // Keep track of room bounding boxes and centers
    const rooms = [];
    const roomCenters = [];
  
    // 2. Place rooms
    for (let i = 0; i < roomCount; i++) {
      const roomW = getRandomInt(roomMinSize, roomMaxSize);
      const roomH = getRandomInt(roomMinSize, roomMaxSize);
  
      // Random top-left corner
      const x = getRandomInt(1, width - roomW - 1);
      const y = getRandomInt(1, height - roomH - 1);
  
      // Pick a random theme
      const theme = roomThemes[getRandomInt(0, roomThemes.length - 1)];
  
      // Carve the room
      carveRoom(x, y, x + roomW - 1, y + roomH - 1, theme);
  
      // Store bounding box and center
      const centerX = Math.floor(x + roomW / 2);
      const centerY = Math.floor(y + roomH / 2);
      rooms.push({ x1: x, y1: y, x2: x + roomW - 1, y2: y + roomH - 1, theme });
      roomCenters.push({ x: centerX, y: centerY });
    }
  
    // 3. Connect rooms with corridors
    // Shuffle to get a random spanning tree
    shuffleArray(roomCenters);
  
    for (let i = 0; i < roomCenters.length - 1; i++) {
      const current = roomCenters[i];
      const next = roomCenters[i + 1];
      // Randomly pick corridor style
      if (Math.random() < 0.2) {
        // 20% chance: carve a winding corridor
        carveWindingCorridor(current.x, current.y, next.x, next.y);
      } else {
        // 80% default: carve an L-shaped corridor
        carveLCorridor(current.x, current.y, next.x, next.y);
      }
    }
  
    // 4. Post-processing: place doors where corridors meet room boundaries
    placeDoors(rooms);
  
    // 5. (Optional) Post-processing: random corridor widening
    corridorWidening();
  
    return dungeon;
  
    // ---- Corridor-Carving Helpers ----
  
    function carveLCorridor(x1, y1, x2, y2) {
      // Randomly decide horizontal-then-vertical or vice versa
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
          dungeon[y][x].theme = null; // corridor has no special theme
        }
      }
    }
  
    function carveVerticalCorridor(y1, y2, x) {
      const start = Math.min(y1, y2);
      const end = Math.max(y1, y2);
      for (let y = start; y <= end; y++) {
        dungeon[y][x].type = 'floor';
        if (dungeon[y][x].theme === null) {
            dungeon[y][x].theme = null; // corridor has no special theme
          }
  
      }
    }
  
    /**
     * Carve a winding corridor by stepping cell-by-cell in a random walk 
     * that heads generally toward the target.
     */
    function carveWindingCorridor(x1, y1, x2, y2) {
      let x = x1;
      let y = y1;
      dungeon[y][x].type = 'floor';        
      if (dungeon[y][x].theme === null) {
        dungeon[y][x].theme = null; // corridor has no special theme
      }

  
      while (x !== x2 || y !== y2) {
        // Move horizontally or vertically, maybe deviate randomly
        if (Math.random() < 0.5) {
          // Try to move in x direction
          if (x < x2) x++;
          else if (x > x2) x--;
        } else {
          // Move in y direction
          if (y < y2) y++;
          else if (y > y2) y--;
        }
        // 10% chance to deviate sideways
        if (Math.random() < 0.1) {
          if (Math.random() < 0.5 && x > 1 && x < width - 1) {
            x += Math.random() < 0.5 ? 1 : -1;
          } else if (y > 1 && y < height - 1) {
            y += Math.random() < 0.5 ? 1 : -1;
          }
        }
        dungeon[y][x].type = 'floor';        
        if (dungeon[y][x].theme === null) {
            dungeon[y][x].theme = null; // corridor has no special theme
        }
  
      }
    }
  
    // ---- Post-Processing Helpers ----
  
    /**
     * Place doors at the boundary between rooms and corridors
     * with a small probability.
     */
    function placeDoors(roomList) {
      const doorChance = 0.3; // 30% chance to place a door at each boundary
      for (const room of roomList) {
        // Check each perimeter cell
        for (let x = room.x1; x <= room.x2; x++) {
          // Top edge
          maybePlaceDoor(x, room.y1 - 1, x, room.y1);
          // Bottom edge
          maybePlaceDoor(x, room.y2 + 1, x, room.y2);
        }
        for (let y = room.y1; y <= room.y2; y++) {
          // Left edge
          maybePlaceDoor(room.x1 - 1, y, room.x1, y);
          // Right edge
          maybePlaceDoor(room.x2 + 1, y, room.x2, y);
        }
      }
  
      function maybePlaceDoor(corridorX, corridorY, roomX, roomY) {
        if (!inBounds(corridorX, corridorY) || !inBounds(roomX, roomY)) return;
  
        const corridorCell = dungeon[corridorY][corridorX];
        const roomCell = dungeon[roomY][roomX];
  
        // corridorCell is floor (theme=null) and roomCell is floor with a theme
        if (
          corridorCell.type === 'floor' &&
          corridorCell.theme === null &&
          roomCell.type === 'floor' &&
          roomCell.theme !== null
        ) {
          // Chance to place door
          if (Math.random() < doorChance) {
            corridorCell.type = 'door';
            corridorCell.theme = null; // a door is still no special theme
          }
        }
      }
    }
  
    /**
     * Simple corridor widening pass: 
     * randomly widen some floor cells adjacent to corridors to get 2-wide corridors.
     */
    function corridorWidening() {
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          if (dungeon[y][x].type === 'floor' && dungeon[y][x].theme === null) {
            // 10% chance to widen horizontally or vertically
            if (Math.random() < 0.01) {
              // Widen horizontally
              if (dungeon[y][x + 1].type === 'wall') {
                dungeon[y][x + 1].type = 'floor';
                dungeon[y][x + 1].theme = null;
              }
              // Widen vertically
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
  
  
  /**
   * Creates an SVG string from the dungeon layout.
   *
   * @param {{type: string, theme: string|null}[][]} dungeon  - 2D array of cells.
   * @param {number} cellSize   - The pixel size of each cell in the SVG.
   * @returns {string}          - An SVG string.
   */
  function dungeonToSVG(dungeon, cellSize = 10, zoom = 1) {
    const rows = dungeon.length;
    const cols = dungeon[0].length;

    // Adjust cell size based on zoom level
    const adjustedCellSize = cellSize * zoom;

    // Overall SVG dimensions in pixels
    const svgWidth = cols * adjustedCellSize;
    const svgHeight = rows * adjustedCellSize;


    let svg = `<svg 
      version="1.1" 
      baseProfile="full" 
      width="${svgWidth}" 
      height="${svgHeight}" 
      xmlns="http://www.w3.org/2000/svg">\n`;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = dungeon[y][x];
        let fillColor = themeColors.wall;
        if (cell.type === 'floor') {
          // If it has a theme, use theme color; otherwise corridor color
          fillColor = cell.theme ? themeColors[cell.theme] : themeColors.defaultCorridor;
        } else if (cell.type === 'door') {
          fillColor = themeColors.door;
        }

        const rectX = x * adjustedCellSize;
        const rectY = y * adjustedCellSize;

        svg += `  <rect 
          x="${rectX}" 
          y="${rectY}" 
          width="${adjustedCellSize}" 
          height="${adjustedCellSize}" 
          fill="${fillColor}" 
        />\n`;
      }
    }

    svg += `</svg>`;
    return svg;
  }
  /**
 * Creates an SVG string for the minimap with fog of war.
 *
 * @param {{type: string, theme: string|null, explored: boolean, visible: boolean}[][]} dungeon
 * @param {number} cellSize
 * @returns {string}
 */
function renderMinimap(dungeon, cellSize = 2) {
  const rows = dungeon.length;
  const cols = dungeon[0].length;
  const svgWidth = cols * cellSize;
  const svgHeight = rows * cellSize;

  let svg = `<svg 
    version="1.1" 
    baseProfile="full" 
    width="${svgWidth}" 
    height="${svgHeight}" 
    xmlns="http://www.w3.org/2000/svg">\n`;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = dungeon[y][x];
      let fillColor = '#000'; // Default: unexplored fog

      if (cell.explored) {
        if (cell.type === 'floor') {
          fillColor = cell.theme ? themeColors[cell.theme] : themeColors.defaultCorridor;
        } else if (cell.type === 'door') {
          fillColor = themeColors.door;
        } else if (cell.type === 'wall') {
          fillColor = themeColors.wall;
        }
      }

      // if (cell.visible) {
      //   fillColor = 'yellow'; // Highlight the visible area
      // }

      svg += `<rect 
        x="${x * cellSize}" 
        y="${y * cellSize}" 
        width="${cellSize}" 
        height="${cellSize}" 
        fill="${fillColor}" 
        stroke="#222"
      />\n`;
    }
  }

  svg += `</svg>`;
  return svg;
}
  
/**
 * Creates an SVG string for a zoomed-in character view.
 *
 * @param {{type: string, theme: string|null}[][]} dungeon
 * @param {number} cellSize
 * @param {Object} player
 * @returns {string}
 */
function renderZoomedView(dungeon, cellSize = 30, player) {
  const visibilityRange = player.visibilityRange;
  const viewSize = visibilityRange * 2 + 1; // Total size of the zoomed view
  const svgSize = viewSize * cellSize;

    // Adjust cell size based on zoom level
  const adjustedCellSize = cellSize ;//* zoom;
  let svg = `<svg 
    version="1.1" 
    baseProfile="full" 
    width="${svgSize}" 
    height="${svgSize}" 
    xmlns="http://www.w3.org/2000/svg">\n`;

  for (let dy = -visibilityRange; dy <= visibilityRange; dy++) {
    for (let dx = -visibilityRange; dx <= visibilityRange; dx++) {
      const x = player.x + dx;
      const y = player.y + dy;

      if (x >= 0 && y >= 0 && y < dungeon.length && x < dungeon[0].length) {
        const cell = dungeon[y][x];
        let fillColor = themeColors.wall;

        if (cell.type === 'floor') {
          fillColor = cell.theme ? themeColors[cell.theme] : themeColors.defaultCorridor;
        } else if (cell.type === 'door') {
          fillColor = themeColors.door;
        }

        const rectX = (dx + visibilityRange) * cellSize;
        const rectY = (dy + visibilityRange) * cellSize;

        svg += `<rect 
          x="${rectX}" 
          y="${rectY}" 
          width="${cellSize}" 
          height="${cellSize}" 
          fill="${fillColor}" 
          stroke="#222"
        />\n`;
        if (cell.monster) {
          svg += `<circle 
            cx="${rectX + adjustedCellSize / 2}" 
            cy="${rectY + adjustedCellSize / 2}" 
            r="${adjustedCellSize / 4}" 
            fill="purple"
            stroke="black"
            stroke-width="1"
          />\n`;
        
          svg += `<text 
            x="${rectX + adjustedCellSize / 2}" 
            y="${rectY + adjustedCellSize / 2}" 
            font-size="${adjustedCellSize / 3}" 
            text-anchor="middle"
            fill="white"
            dominant-baseline="middle"
          >
            ${cell.monster.name.charAt(0)}
          </text>\n`;
        }
      }
      
    }
  }

  // Draw the player in the center
  svg += player.svg(cellSize, player.visibilityRange, player.direction, player.character)
  // `<circle 
  //   cx="${svgSize / 2}" 
  //   cy="${svgSize / 2}" 
  //   r="${cellSize / 3}" 
  //   fill="red"
  // />\n`;

  svg += `</svg>`;
  return svg;
}
 
/**
 * Updates visibility and exploration status based on the player's position.
 */
function updateVisibility(dungeon, player) {
  dungeon.forEach(row => row.forEach(cell => (cell.visible = false)));

  for (let dy = -player.visibilityRange; dy <= player.visibilityRange; dy++) {
    for (let dx = -player.visibilityRange; dx <= player.visibilityRange; dx++) {
      const x = player.x + dx;
      const y = player.y + dy;

      if (x >= 0 && y >= 0 && y < dungeon.length && x < dungeon[0].length) {
        dungeon[y][x].visible = true;
        dungeon[y][x].explored = true;
      }
    }
  }
}


// const player = {
//   x: 5, // Player's current column
//   y: 5, // Player's current row
//   visibilityRange: 8 // Number of cells visible around the player
// };
// document.addEventListener('keydown', (event) => {
//   switch (event.key) {
//     case 'ArrowUp': player.y = Math.max(player.y - 1, 0); break;
//     case 'ArrowDown': player.y = Math.min(player.y + 1, dungeon.length - 1); break;
//     case 'ArrowLeft': player.x = Math.max(player.x - 1, 0); break;
//     case 'ArrowRight': player.x = Math.min(player.x + 1, dungeon[0].length - 1); break;
//   }

//   updateVisibility(dungeon, player);
//   document.getElementById('minimap').innerHTML = renderMinimap(dungeon);
//   document.getElementById('zoomed-view').innerHTML = renderZoomedView(dungeon, 50, player);
// });
  // //add minimap to the top right of the screen
  // const miniMap = dungeonToSVG(dungeonArray, 3);
  // const miniMapDiv = document.createElement('div');
  // miniMapDiv.innerHTML = miniMap;
  // miniMapDiv.style.position = 'absolute';
  // miniMapDiv.style.top = '0';
  // miniMapDiv.style.right = '0';
  // miniMapDiv.style.zIndex = '1000';
  // miniMapDiv.style.border = '1px solid white';
  // miniMapDiv.style.pointerEvents = 'none';
  // gameDiv.appendChild(miniMapDiv);

  
