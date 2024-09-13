import { Spaceship } from './spaceship.js';
import { Sprite } from './asteroid.js';
import { StarField } from './star-field.js';
import { Sprites } from './sprites.js';

let sprites = new Sprites();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';
let zoomLevel = .5
let starField = new StarField(canvas, ctx);
let allSprites = sprites.sprites.map(sprite => new Spaceship(canvas, ctx, sprite))
let spaceship = allSprites[0];
let spaceship2 = allSprites[1];
spaceship.target = spaceship2;
spaceship2.target = spaceship;
spaceship.aimTowards = false;
spaceship2.aimTowards = true;
//.1// middle zoom level //.3// largest zoom leve .05; // Default zoom level

starField.setZoomLevel(1);


ctx.scale(zoomLevel, zoomLevel)
let width = canvas.width / zoomLevel
let height = canvas.height / zoomLevel
let change = false
function gameLoop() {
    // Update zoom level if needed
    if (change) {
        width = canvas.width / zoomLevel;
        height = canvas.height / zoomLevel;
        change = false; // Reset change flag
    }

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Reset the transformation matrix to the identity matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Apply the new scale
    ctx.scale(zoomLevel, zoomLevel);

    // Redraw the canvas content here

    allSprites.forEach(sprite => {
        sprite.update(zoomLevel);
    });
    // allSprites[0].rotationSpeed += 0.01;


    // // Check for collisions between all sprites
    // for (let i = 0; i < allSprites.length; i++) {
    //     for (let j = i + 1; j < allSprites.length; j++) {
    //         if (checkCollision(allSprites[i], allSprites[j])) {
    //             flashScreen(.1, flashColor); // Flash the screen on collision
    //             // handleBounce(allSprites[i], allSprites[j], bounceFactor);
    //         }
    //     }
    // }

    // if (spaceship && spaceship2) {
    //if zoomLevel changes set change to true
        let newzoomLevel = calculatezoomLevel(spaceship, spaceship2);
        if (newzoomLevel !== zoomLevel) {
            zoomLevel = newzoomLevel;
            change = true;
        }
    //     spaceship.setzoomLevel(zoomLevel);
    //     spaceship2.setzoomLevel(zoomLevel);
    // }

    // Display ship1's coordinates and canvas dimensions
    // ctx.font = `${24/zoomLevel}px Arial`;
    // ctx.fillStyle = 'white'; //(baseShipX - canvasWidth / 2) / zoomLevel + canvasWidth / 2;
    // ctx.fillText(`Ship1 X: ${(spaceship.x)} : ${zoomLevel} : ${spaceship.x}`, width/2, 100);
    // ctx.fillText(`Ship1 Y: ${(spaceship.y)} : ${zoomLevel} : ${spaceship.y} `, width/2, height/8);
    // ctx.fillText(`Canvas Width: ${canvas.width / zoomLevel} : ${canvas.width}`,width/2, height/6);
    // ctx.fillText(`Canvas Height: ${canvas.height / zoomLevel}`, width/2, height/4);


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
    const shipY = (relX * zoom) / 20


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
    if (distance < 1500) {
        return .3; // Zoom in
    } else if (distance < 4000) {
        return .15; // Mid-level zoom
    } else {
        return .08; // Zoom out (normal size)
    }
}
document.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowUp') {
        spaceship.momentumX += Math.cos(spaceship.angle) * spaceship.speed;
        spaceship.momentumY += Math.sin(spaceship.angle) * spaceship.speed;
    }
    if (e.code === 'ArrowLeft') {
        spaceship.rotationSpeed = -0.05;
        // zoomLevel += 0.05; // Example: increase zoom leve  l
        // change = true
    }

    if (e.code === 'ArrowRight') {
        spaceship.rotationSpeed = 0.05;
        // zoomLevel -= 0.05; // Example: increase zoom leve  l
        // change = true
    }
    if (e.code === 'Space') spaceship.shoot();
});

document.addEventListener('keyup', (e) => {
    //  if (e.code === 'ArrowUp') spaceship.speed = 0;
    if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') spaceship.rotationSpeed = 0;
});

gameLoop();