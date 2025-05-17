import { Spaceship } from './spaceship.js';
import { Asteroid } from './asteroid.js'; // Changed from Sprite
import { StarField } from './star-field.js';
import { Sprites } from './sprites.js';
import { LaserProjectile } from './bullet.js';
import { PlasmaProjectile } from './PlasmaProjectile.js';
import { LaserWeapon } from './LaserWeapon.js';
import { PlasmaWeapon } from './PlasmaWeapon.js';
import { PowerUp } from './PowerUp.js'; // Import base PowerUp
import { ShieldInvulnerabilityPowerUp } from './ShieldInvulnerabilityPowerUp.js';

let spriteDefinitions = new Sprites();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';

let zoomLevel = 0.5;
let starField = new StarField(canvas, ctx);
starField.setZoomLevel(1); // Initial starfield zoom

// Game Objects
let gameObjects = [];
let playerShip;
let enemyShip; // Assuming the second ship is an enemy for now

// Initialize player and enemy ships from sprite definitions
const shipSpriteData = spriteDefinitions.sprites.filter(s => s.type === 'ship');
if (shipSpriteData.length > 0) {
    // Assuming the first ship definition is the player
    playerShip = new Spaceship(shipSpriteData[0], canvas, ctx);
    gameObjects.push(playerShip);
    console.log("Player ship created:", playerShip);

    // Spawn all other ship definitions as enemies
    for (let i = 1; i < shipSpriteData.length; i++) {
        const enemySprite = shipSpriteData[i];
        const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
        if (playerShip) newEnemyShip.target = playerShip;
        // newEnemyShip.aimTowards = true; // This should be handled by the AI function or spriteData if needed
        if (enemySprite.ai) { // If AI is defined in spriteData, it's already set in Spaceship constructor
             newEnemyShip.aimTowards = true; // Default to aiming if an AI is present
        }
        gameObjects.push(newEnemyShip);
        console.log(`Enemy ship "${enemySprite.name}" created:`, newEnemyShip);
        if (i === 1) enemyShip = newEnemyShip; // Keep a reference to the first enemy for zoom calculation, for now
    }

} else {
    console.error("Player ship sprite data not found!");
}

// Remove the old single enemyShip initialization if it was separate
// The loop above now handles all non-player ships.
// The 'enemyShip' variable is now just a reference to the first spawned enemy for zoom logic.
// This might need to be refactored if zoom should consider multiple enemies or the closest one.


// Initialize some asteroids
const asteroidSpriteData = spriteDefinitions.sprites.find(s => s.type === 'asteroid_large');
if (asteroidSpriteData) {
    console.log("Found asteroid_large sprite data:", asteroidSpriteData);
    for (let i = 0; i < 5; i++) {
        const individualAsteroidData = {
            ...asteroidSpriteData, // Spread existing asteroid data
            // Override startx and starty for each new asteroid
            startx: Math.random() * (canvas.width / zoomLevel) * 0.8 + (canvas.width / zoomLevel * 0.1), // Avoid edges
            starty: Math.random() * (canvas.height / zoomLevel) * 0.8 + (canvas.height / zoomLevel * 0.1) // Avoid edges
        };
        const newAsteroid = new Asteroid(individualAsteroidData, canvas, ctx);
        gameObjects.push(newAsteroid);
        console.log("Asteroid created:", newAsteroid);
    }
} else {
    console.error("Asteroid_large sprite data not found!");
}

console.log("Initial gameObjects:", gameObjects);

let lastTime = performance.now(); // Initialize lastTime with a valid timestamp
let worldWidth = canvas.width / zoomLevel;
let worldHeight = canvas.height / zoomLevel;
let viewChanged = true; // Flag to recalculate world dimensions

function gameLoop(currentTime) {
    // Cap deltaTime to prevent huge jumps on first frame or after tab resume
    let deltaTime = (currentTime - lastTime) / 1000; // Delta time in seconds
    if (deltaTime > 0.1) { // Max deltaTime of 0.1 seconds (10 FPS equivalent)
        deltaTime = 0.1;
    }
    lastTime = currentTime;

    if (deltaTime <= 0) { // Skip frame if deltaTime is not positive
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update zoom level dynamically (example based on original code)
    if (playerShip && enemyShip) {
        let newZoomLevel = calculateDynamicZoomLevel(playerShip, enemyShip);
        if (newZoomLevel !== zoomLevel) {
            zoomLevel = newZoomLevel;
            viewChanged = true;
        }
    }

    if (viewChanged) {
        worldWidth = canvas.width / zoomLevel;
        worldHeight = canvas.height / zoomLevel;
        // Update zoom for entities that might need it directly (optional)
        // gameObjects.forEach(obj => obj.setZoomLevel && obj.setZoomLevel(zoomLevel));
        viewChanged = false;
    }

    // --- UPDATE ---
    // Update all game objects (player, enemies, asteroids)
    gameObjects.forEach(obj => {
        if (obj.isActive) {
            obj.update(deltaTime, zoomLevel);
            // If obj is a spaceship, its bullets are updated within its own update method
        }
    });
    
    // Add newly shot bullets from spaceships to the main gameObjects array
    gameObjects.forEach(obj => {
        if (obj instanceof Spaceship && obj.bullets.length > 0) {
            obj.bullets.forEach(bullet => {
                if (!gameObjects.includes(bullet)) { // Avoid adding duplicates if already managed
                    gameObjects.push(bullet);
                }
            });
            // Clear spaceship's bullet array as they are now globally managed for collision
            // OR, let spaceships manage their bullets for drawing, but add to a global list for collision
            // For simplicity now, we assume bullets are added to gameObjects when shot.
            // The spaceship's shoot method should add to its own list, and we pick them up here.
        }
    });


    // --- COLLISION DETECTION ---
    handleCollisions();

    // --- CLEANUP ---
    // Remove inactive objects (destroyed ships, asteroids, used projectiles)
    gameObjects = gameObjects.filter(obj => obj.isActive);


    // --- DRAW ---
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    ctx.scale(zoomLevel, zoomLevel);   // Apply zoom
    ctx.clearRect(0, 0, worldWidth, worldHeight); // Clear canvas based on world dimensions

    // Draw Starfield (should be drawn first, behind everything)
    starField.update(deltaTime, zoomLevel); // Pass zoomLevel if starfield needs it
    starField.draw();

    // Draw all active game objects
    gameObjects.forEach(obj => {
        if (obj.isActive) {
            obj.draw();
        }
    });

    // --- DEBUG RECTANGLE ---
    ctx.fillStyle = 'red';
    ctx.fillRect(10, 10, 50, 50); // Draw a red square at top-left (in world coordinates)
    // --- END DEBUG RECTANGLE ---

    requestAnimationFrame(gameLoop);
}

function handleCollisions() {
    for (let i = 0; i < gameObjects.length; i++) {
        for (let j = i + 1; j < gameObjects.length; j++) {
            const obj1 = gameObjects[i];
            const obj2 = gameObjects[j];

            if (!obj1.isActive || !obj2.isActive) continue;

            // Using GameObject's AABB checkCollisionWith method
            if (obj1.checkCollisionWith(obj2)) {
                // Projectile vs Asteroid
                if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj2 instanceof Asteroid) {
                    const asteroidWasActive = obj2.isActive;
                    obj2.takeDamage(obj1.damage);
                    obj1.onHit(obj2);
                    if (asteroidWasActive && !obj2.isActive) { // Asteroid was destroyed by this hit
                        const newPowerUp = obj2.onDestruction(); // Call onDestruction, which might return a powerUp
                        if (newPowerUp) {
                            gameObjects.push(newPowerUp);
                        }
                    }
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj1 instanceof Asteroid) {
                    const asteroidWasActive = obj1.isActive;
                    obj1.takeDamage(obj2.damage);
                    obj2.onHit(obj1);
                    if (asteroidWasActive && !obj1.isActive) {
                        const newPowerUp = obj1.onDestruction();
                        if (newPowerUp) {
                            gameObjects.push(newPowerUp);
                        }
                    }
                }

                // Projectile vs Spaceship (avoid self-collision)
                else if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj2 instanceof Spaceship && obj1.owner !== obj2) {
                    obj2.takeDamage(obj1.damage);
                    obj1.onHit(obj2);
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj1 instanceof Spaceship && obj2.owner !== obj1) {
                    obj1.takeDamage(obj2.damage);
                    obj2.onHit(obj1);
                }
                
                // PlayerShip vs Asteroid
                else if (obj1 === playerShip && obj2 instanceof Asteroid) {
                    if (playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj2)) { // Using specific method if available
                         playerShip.takeDamage(20);
                         const asteroidWasActive = obj2.isActive;
                         obj2.takeDamage(100);
                         if (asteroidWasActive && !obj2.isActive) {
                            const newPowerUp = obj2.onDestruction();
                            if (newPowerUp) {
                                gameObjects.push(newPowerUp);
                            }
                        }
                    }
                } else if (obj2 === playerShip && obj1 instanceof Asteroid) {
                     if (playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj1)) {
                        playerShip.takeDamage(20);
                        const asteroidWasActive = obj1.isActive;
                        obj1.takeDamage(100);
                        if (asteroidWasActive && !obj1.isActive) {
                            const newPowerUp = obj1.onDestruction();
                            if (newPowerUp) {
                                gameObjects.push(newPowerUp);
                            }
                        }
                    }
                }

                // PlayerShip vs PowerUp
                else if (obj1 === playerShip && obj2 instanceof PowerUp) {
                    obj2.onCollected(playerShip); // PowerUp handles its own destruction
                } else if (obj2 === playerShip && obj1 instanceof PowerUp) {
                    obj1.onCollected(playerShip);
                }
                
                // Potentially Spaceship vs Spaceship (if not player vs enemy, e.g. friendly fire off)
                // For now, this is simple. More complex rules can be added.
            }
        }
    }
}


// Original function for dynamic zoom, slightly adapted
function calculateDynamicZoomLevel(ship1, ship2) {
    const distance = Math.sqrt(Math.pow(ship1.x - ship2.x, 2) + Math.pow(ship1.y - ship2.y, 2));
    if (distance < 800) return 0.7;  // Zoom in more
    if (distance < 1500) return 0.5; 
    else if (distance < 4000) return 0.25; 
    else return 0.15; 
}

// --- INPUT HANDLING ---
document.addEventListener('keydown', (e) => {
    if (!playerShip || !playerShip.isActive) return;

    const thrustAmount = 200; // Pixels per second^2 or a direct momentum change factor

    switch (e.code) {
        case 'ArrowUp':
            // Apply thrust in the direction the ship is facing
            // thrustAmount is an acceleration. momentum = momentum + acceleration * deltaTime
            // Ensure playerShip.spriteData.speed or a similar thrust property exists
            const actualThrust = playerShip.spriteData.speed || 5; // This 'speed' is more like a thrust force/acceleration magnitude
            const thrustMagnitude = actualThrust * 10; // Adjust this multiplier for desired thrust strength
            playerShip.momentumX += Math.cos(playerShip.angle) * thrustMagnitude;
            playerShip.momentumY += Math.sin(playerShip.angle) * thrustMagnitude;
            break;
        case 'ArrowLeft':
            // rotationSpeed should be defined in spriteData (radians per second)
            playerShip.rotationSpeed = -(playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'ArrowRight':
            playerShip.rotationSpeed = (playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'Space':
            playerShip.shoot();
            break;
        case 'Digit1': // Equip LaserWeapon
            if (playerShip) {
                playerShip.equipWeapon(new LaserWeapon(playerShip));
                console.log("Equipped Laser Weapon");
            }
            break;
        case 'Digit2': // Equip PlasmaWeapon
            if (playerShip) {
                playerShip.equipWeapon(new PlasmaWeapon(playerShip));
                console.log("Equipped Plasma Weapon");
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (!playerShip || !playerShip.isActive) return;

    switch (e.code) {
        case 'ArrowUp':
            // Optional: stop thrust, or let momentum handle it
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            playerShip.rotationSpeed = 0;
            break;
    }
});

// Start the game loop
requestAnimationFrame(gameLoop);