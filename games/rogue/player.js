this.cellSize = 10
this.width =  Math.floor(window.innerWidth / this.cellSize)-1;
this.height = Math.floor(window.innerHeight / this.cellSize)-1;
this.roomCount = 10;
this.roomMinSize = 5;
this.roomMaxSize = 10;
const dungeon = generateDungeon(this.width, this.height, this.roomCount, this.roomMinSize, this.roomMaxSize);
// Place monsters after generating rooms and corridors
placeMonsters(dungeon, 0.15);

function findRandomFloorLocation() {
    let x, y;
    do {
      x = Math.floor(Math.random() * dungeon[0].length);
      y = Math.floor(Math.random() * dungeon.length);
    } while (dungeon[y][x].type !== "floor");
    return { x, y };
  }
  
  const randomFloorLocation = findRandomFloorLocation();
const player = {
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
  visibilityRange: 13, // Number of cells visible around the player
};

function renderHeroSVG(svgSize, direction = "West") {
  radius = svgSize / 40;
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
      : 315
  }, ${svgSize / 2}, ${svgSize / 2})" />
        `;
  return svg;
}
/**
 * Generates an SVG string representing a hero character.
 *
 * @param {number} size - Size of the hero SVG in pixels.
 * @returns {string} - SVG string for the hero character.
 */
// function renderHeroSVG(size = 50) {
function getCharacterSVG(size, visibilityRange, direction = "West", character) {
    console.log('getCharacterSVG', size, direction)
    const rotation = direction === "East"
        ? 0
        : direction === "South"
        ? 90
        : direction === "West"
        ? 180
        : 270;
            // <g transform="rotate(${rotation}, ${size / 2}, ${size / 2}) scale(${size / 100}) translate(${size / 2}, ${size / 2})">                <!-- Body --></g>
    return /*html*/ `
        <svg 
            x="${size*visibilityRange}"
            y="${size*visibilityRange}"
            width="${size*2}" 
            height="${size*2}" 
            viewBox="0 0 200 200" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <g transform="rotate(${rotation}, ${size/2}, ${size/2})">                <!-- Body -->
                ${character}
            </g>
        </svg>
    `;
}

function moveCharacter(direction) {
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

    if (dungeon[newY][newX].type === "floor") {
        player.x = newX;
        player.y = newY;
    }
}
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      moveCharacter(player.direction);
      break;
    case "ArrowDown":
      moveCharacter(
        player.direction === "East"
          ? "West"
          : player.direction === "North"
          ? "South"
          : player.direction === "West"
          ? "East"
          : "North",
      );
      break;
    case "ArrowLeft":
      player.direction = player.direction === "East"
        ? "North"
        : player.direction === "North"
        ? "West"
        : player.direction === "West"
        ? "South"
        : "East";
      break;
    case "ArrowRight":
      player.direction = player.direction === "East"
        ? "South"
        : player.direction === "South"
        ? "West"
        : player.direction === "West"
        ? "North"
        : "East";
      break;
  }

  updateVisibility(dungeon, player);
  document.getElementById("minimap").innerHTML = renderMinimap(dungeon, 2);
  document.getElementById("zoomed-view").innerHTML = renderZoomedView(
    dungeon,
    100,
    player,
  );
});
