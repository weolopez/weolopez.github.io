import { themeColors } from '../utils/data.js';

export function dungeonToSVG(dungeon, cellSize = 10, zoom = 1) {
  const rows = dungeon.length;
  const cols = dungeon[0].length;

  const adjustedCellSize = cellSize * zoom;

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

export function renderMinimap(dungeon, cellSize = 2) {
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
      let fillColor = '#000';

      if (cell.explored) {
        if (cell.type === 'floor') {
          fillColor = cell.theme ? themeColors[cell.theme] : themeColors.defaultCorridor;
        } else if (cell.type === 'door') {
          fillColor = themeColors.door;
        } else if (cell.type === 'wall') {
          fillColor = themeColors.wall;
        }
      }

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

export function renderZoomedView(dungeon, cellSize = 30, player) {
  const visibilityRange = player.visibilityRange;
  const viewSize = visibilityRange * 2 + 1;
  const svgSize = viewSize * cellSize;

  const adjustedCellSize = cellSize;
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

  svg += player.svg(cellSize, player.visibilityRange, player.direction, player.character)

  svg += `</svg>`;
  return svg;
}
 
export function updateVisibility(dungeon, player) {
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