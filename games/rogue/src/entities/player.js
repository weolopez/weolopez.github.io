import { findRandomFloorLocation } from '../utils/helpers.js';

export function createPlayer(dungeon) {
  const randomFloorLocation = findRandomFloorLocation(dungeon);
  
  return {
    x: randomFloorLocation.x,
    y: randomFloorLocation.y,
    direction: "East",
    svg: getCharacterSVG,
    character: `     <circle cx="50" cy="60" r="25" fill="#2c3e50" stroke="#1c2833" stroke-width="2"/>
                  
                  <!-- Head -->
                  <circle cx="50" cy="30" r="15" fill="#f1c40f" stroke="#f39c12" stroke-width="2"/>
                  
                  <!-- Eyes -->
                  <circle cx="44" cy="28" r="2" fill="#000"/>
                  <circle cx="56" cy="28" r="2" fill="#000"/>
                  
                  <!-- Shield -->
                  <path 
                      d="M75,60 Q85,50 75,40 Q65,50 75,60" 
                      fill="#c0392b" 
                      stroke="#922b21" 
                      stroke-width="2"
                  />
                  
                  <!-- Sword -->
                  <rect x="25" y="45" width="5" height="30" fill="#bdc3c7" stroke="#7f8c8d" stroke-width="1"/>
                  <rect x="23" y="40" width="9" height="5" fill="#e67e22" stroke="#d35400" stroke-width="1"/>
                  
                  <!-- Cape -->
                  <path 
                      d="M40,60 Q30,80 60,80 Q70,60 60,60" 
                      fill="#e74c3c" 
                      stroke="#c0392b" 
                      stroke-width="2"
                  />
                  
                  <!-- Hero Badge -->
                  <text 
                      x="50%" 
                      y="90%" 
                      dominant-baseline="middle" 
                      text-anchor="middle" 
                      font-size="10" 
                      fill="#fff"
                      font-family="Arial, sans-serif"
                  >
                      
                  </text>`,
    visibilityRange: 13,
    health: 100,
    attack: 25
  };
}

export function renderHeroSVG(svgSize, direction = "West") {
  const radius = svgSize / 40;
  const svg = `
        <circle cx="${svgSize / 2}" cy="${
    svgSize / 2
  }" r="${radius}" fill="yellow" />
        <path d="M${svgSize / 2},${svgSize / 2} L${svgSize / 2},${
    svgSize / 2 - radius
  } A${radius},${radius} 0 0,1 ${svgSize / 2 + radius},${
    svgSize / 2
  } z" fill="black" transform="rotate(${
    direction === "East"
      ? 45
      : direction === "South"
      ? 135
      : direction === "West"
      ? 225
      : 135
  }, ${svgSize / 2}, ${svgSize / 2})" />
        `;
  return svg;
}

export function getCharacterSVG(size, visibilityRange, direction = "West", character) {
    console.log('getCharacterSVG', size, direction)
    const rotation = direction === "East"
        ? 0
        : direction === "South"
        ? 90
        : direction === "West"
        ? 0
        : 90;

    return /*html*/ `
        <svg 
            x="${size*visibilityRange}"
            y="${size*visibilityRange}"
            width="${size*2}" 
            height="${size*2}" 
            viewBox="0 0 200 200" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <g transform="  rotate(${rotation}, ${size/2}, ${size/2}) 
                ${direction === "West" ? "translate(100,0) scale(-1,1)" : ""}
                ${direction === "North" ? "translate(100,100) scale(-1,-1)" : ""}
                ">
                ${character}
            </g>
        </svg>
    `;
}

export function moveCharacter(player, dungeon, direction) {
    function handleMonsterCollision(monster) {
        console.log(`Encountered a ${monster.name}!`);
    
        // Example combat logic
        monster.health -= player.attack;
        console.log(`${monster.name} health: ${monster.health}`);
    
        if (monster.health <= 0) {
            console.log(`${monster.name} defeated!`);
            dungeon[player.y][player.x].monster = null;
        } else {
            player.health -= monster.attack;
            console.log(`Player health: ${player.health}`);
    
            if (player.health <= 0) {
                console.log("Player defeated!");
                // Handle player defeat
            }
        }
    }
    
    let newX = player.x;
    let newY = player.y;

    if (direction === "East") {
        newX = Math.min(player.x + 1, dungeon[0].length - 1);
    } else if (direction === "North") {
        newY = Math.max(player.y - 1, 0);
    } else if (direction === "West") {
        newX = Math.max(player.x - 1, 0);
    } else if (direction === "South") {
        newY = Math.min(player.y + 1, dungeon.length - 1);
    }

    const targetCell = dungeon[newY][newX];

    if (targetCell.type === "floor") {
        if (targetCell.monster) {
            handleMonsterCollision(targetCell.monster);
        } else {
            player.x = newX;
            player.y = newY;
        }
    }
}