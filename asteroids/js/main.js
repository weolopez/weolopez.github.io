import { Spaceship } from './spaceship.js';
import { Asteroid } from './asteroid.js';
import { StarField } from './star-field.js';
import { Sprites } from './sprites.js';

let sprites = new Sprites();
const canvas = document.getElementById('gameCanvas');
//background of canvas is white
// canvas.style.backgroundColor = 'white';
const ctx = canvas.getContext('3d');
//set ctx background color to black
ctx.fillStyle = 'black';
canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
ctx.scale(.05,.05)

// let starField = new StarField(canvas, ctx);
// let allSprites = sprites.sprites.map(sprite => new Spaceship(canvas, ctx, sprite))
let spaceship = new Spaceship(canvas, ctx, sprites[0])
// let spaceship = allSprites[0];
// let spaceship2 = allSprites[1];
// spaceship.target = spaceship2;
// spaceship2.target = spaceship;
// spaceship.aimTowards = false;
// spaceship2.aimTowards = false;
//.1// middle zoom level //.3// largest zoom leve .05; // Default zoom level
let zoomLevel = 1;
    // starField.setZoomLevel(1);
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw the star field in the background
    // allSprites.forEach(sprite => {
    //     sprite.update(.1);
    // });
    spaceship.update(.1);


    // Check for collisions between all sprites
    // for (let i = 0; i < allSprites.length; i++) {
    //     for (let j = i + 1; j < allSprites.length; j++) {
    //         if (checkCollision(allSprites[i], allSprites[j])) {
    //             flashScreen(.1, flashColor); // Flash the screen on collision
    //             // handleBounce(allSprites[i], allSprites[j], bounceFactor);
    //         }
    //     }
    // }

    // if (spaceship && spaceship2) {
    //     zoomLevel = calculatezoomLevel(spaceship, spaceship2);
    //     spaceship.setzoomLevel(zoomLevel);
    //     spaceship2.setzoomLevel(zoomLevel);
    // }

    // Display ship1's coordinates and canvas dimensions
    // ctx.font = '16px Arial';
    // ctx.fillStyle = 'white'; //(baseShipX - canvasWidth / 2) / zoomLevel + canvasWidth / 2;
    // ctx.fillText(`Ship1 X: ${ (spaceship.x+808.5/zoomLevel) } : ${spaceship.x/zoomLevel} : ${spaceship.x}`, canvas.width - 450, 20);
    // ctx.fillText(`Ship1 Y: ${ (spaceship.y+581.75/zoomLevel) } : ${spaceship.y/zoomLevel} : ${spaceship.y} `, canvas.width - 450, 40);
    // ctx.fillText(`Canvas Width: ${canvas.width/zoomLevel} : ${canvas.width }`, canvas.width - 450, 60);
    // ctx.fillText(`Canvas Height: ${canvas.height /zoomLevel }`, canvas.width - 450, 80);


    requestAnimationFrame(gameLoop);
}

function calculateShipPosition(relX, relY, zoom) {
    let canvasWidth = canvas.width
    let canvasHeight = canvas.height
    // Calculate the visible area of the canvas at the current zoom level
    const visibleWidth = canvasWidth / zoom;
    const visibleHeight = canvasHeight / zoom;
    
    // Calculate the offset to keep the ship in view
    const offsetX = (visibleWidth - canvasWidth) / 2;
    // const offsetY = (visibleHeight - canvasHeight) / 2;
    
    // Calculate the ship's position
    const shipX = relX + canvasWidth 
    // const shipY = offsetY + relY * (visibleHeight - offsetY * 2);
    // const shipX = (relX * zoom)/20
    const shipY = (relX * zoom)/20

    
    return Math.round(shipX);
}
// Example usage in the game loop
const bounceFactor = 0.8; // Configurable bounce factor
const flashDuration = 100; // Duration of the screen flash in milliseconds
const flashColor = 'red'; // Color of the screen flash

// Function to flash the screen
function flashScreen(duration, color) {
    const originalBackgroundColor = document.body.style.backgroundColor;
    document.body.style.backgroundColor = color;

    setTimeout(() => {
        document.body.style.backgroundColor = originalBackgroundColor;
    }, duration);
}

// Function to check for collisions between two sprites
function checkCollision(sprite1, sprite2) {
        const dx = sprite1.x - sprite2.x;
        const dy = sprite1.y - sprite2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < sprite2.width / 2 + sprite1.width / 2;
}
// Function to handle bounce effect
function handleBounce(sprite1, sprite2, bounceFactor) {
    const dx = sprite1.x - sprite2.x;
    const dy = sprite1.y - sprite2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Normalize the direction vector
    const nx = dx / distance;
    const ny = dy / distance;

    // Calculate relative velocity
    const dvx = sprite1.momentumX - sprite2.momentumX;
    const dvy = sprite1.momentumY - sprite2.momentumY;

    // Calculate the velocity along the normal direction
    const dotProduct = dvx * nx + dvy * ny;

    // Calculate the bounce effect
    const bounce = 2 * dotProduct / (sprite1.mass + sprite2.mass);

    // Update the momentum of the sprites
    sprite1.momentumX -= bounce * sprite2.mass * nx * bounceFactor;
    sprite1.momentumY -= bounce * sprite2.mass * ny * bounceFactor;
    sprite2.momentumX += bounce * sprite1.mass * nx * bounceFactor;
    sprite2.momentumY += bounce * sprite1.mass * ny * bounceFactor;
}

//.1// middle zoom level //.3// largest zoom leve .05; // Default zoom level
function calculatezoomLevel(spaceship, spaceship2) {
    const distance = Math.sqrt(Math.pow(spaceship.x - spaceship2.x, 2) + Math.pow(spaceship.y - spaceship2.y, 2));
    if (distance < 100) {
        return .3; // Zoom in
    } else if (distance < 300) {
        return .1; // Mid-level zoom
    } else {
        return .05; // Zoom out (normal size)
    }
}
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') {
        spaceship.momentumX += Math.cos(spaceship.angle) * spaceship.speed;
        spaceship.momentumY += Math.sin(spaceship.angle) * spaceship.speed;
    }
    if (e.code === 'ArrowLeft') 
        spaceship.rotationSpeed = -0.05;
    if (e.code === 'ArrowRight') 
        spaceship.rotationSpeed = 0.05;
    if (e.code === 'Space') spaceship.shoot();
});

document.addEventListener('keyup', (e) => {
  //  if (e.code === 'ArrowUp') spaceship.speed = 0;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') spaceship.rotationSpeed = 0;
});

gameLoop();