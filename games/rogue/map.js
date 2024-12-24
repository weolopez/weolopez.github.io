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
  
    // Some example room themes
    const roomThemes = ['library', 'armory', 'dining hall', 'prison', 'storeroom', 'Indoor Jungle'];
  
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
  function dungeonToSVG(dungeon, cellSize = 10) {
    const rows = dungeon.length;
    const cols = dungeon[0].length;
  
    // Overall SVG dimensions in pixels
    const svgWidth = cols * cellSize;
    const svgHeight = rows * cellSize;
  
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
  
        const rectX = x * cellSize;
        const rectY = y * cellSize;
  
        svg += `  <rect 
          x="${rectX}" 
          y="${rectY}" 
          width="${cellSize}" 
          height="${cellSize}" 
          fill="${fillColor}" 
        />\n`;
      }
    }
  
    svg += `</svg>`;
    return svg;
  }
  
  // -------------------- Example usage -------------------- //
  
  const gameDiv = document.getElementById('game');
  const cellSize = 20; 
  // Convert from CSS px in your container to dungeon cells
  const width = Math.floor(gameDiv.clientWidth / cellSize);
  const height = Math.floor(gameDiv.clientHeight / cellSize);
  
  // Adjust to your preference
  const roomCount = 8;
  const roomMinSize = 3;
  const roomMaxSize = 6;
  
  // Generate the improved dungeon
  const dungeonArray = generateDungeon(width, height, roomCount, roomMinSize, roomMaxSize);
  
  // Convert the dungeon layout to SVG
  const svgDungeon = dungeonToSVG(dungeonArray, cellSize);
  window.dungeon = dungeonArray
  // Render it
  gameDiv.innerHTML = svgDungeon;
  
