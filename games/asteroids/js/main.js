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
import AudioManager from './AudioManager.js';

let spriteDefinitions = new Sprites();
let audioManager = new AudioManager();

const shipsImage = new Image(); // Image for ship selection screen
shipsImage.src = './ships.png'; // Assuming ships.png is in the same directory as index.html
// shipsImage.onload = () => { console.log("Ships.png loaded for selection screen"); }; // Optional: for debugging
// shipsImage.onerror = () => { console.error("Error loading ships.png for selection screen"); };

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
let enemyShip; // Reference to the first spawned enemy, used for zoom calculation
let score = 0;
let lives = 3;
const GameState = {
    SHIP_SELECTION: 'ship_selection',
    TITLE_SCREEN: 'title_screen',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    PAUSED: 'paused',
    PLAYER_DIED_CHOICE: 'player_died_choice' // For Part 2
};
let currentGameState = GameState.SHIP_SELECTION; // Start with ship selection

let selectablePlayerShips = [];
let currentShipSelectionIndex = 0;
let selectedPlayerSpriteName = null;

function initializeShipSelection() {
    selectablePlayerShips = spriteDefinitions.sprites.filter(
        s => s.type === 'ship' && !s.ai // Filter for ships without an AI property
    );
    if (selectablePlayerShips.length === 0) {
        console.error("No selectable player ships found! Defaulting to the first ship in sprites.");
        // Fallback: use the first ship definition if no specific player ships are found
        const allShips = spriteDefinitions.sprites.filter(s => s.type === 'ship');
        if (allShips.length > 0) {
            selectablePlayerShips.push(allShips[0]);
        } else {
            console.error("CRITICAL: No ship definitions found at all!");
            // Further fallback or error state might be needed here
        }
    }
    // Set a default selected ship if none was chosen (e.g. first time)
    if (!selectedPlayerSpriteName && selectablePlayerShips.length > 0) {
        selectedPlayerSpriteName = selectablePlayerShips[0].name;
    }
    currentShipSelectionIndex = Math.max(0, selectablePlayerShips.findIndex(s => s.name === selectedPlayerSpriteName));
}

initializeShipSelection(); // Call it once at the start

let currentWave = 0;
let playerShieldWasActive = false; // For tracking shield state changes

// Player ship and enemies are now initialized in resetGame() or after ship selection.
// const shipSpriteData = spriteDefinitions.sprites.filter(s => s.type === 'ship');
// if (shipSpriteData.length > 0) {
//     playerShip = new Spaceship(shipSpriteData[0], canvas, ctx);
//     playerShip.lives = lives;
//     gameObjects.push(playerShip);
//     console.log("Player ship created:", playerShip);

//     for (let i = 1; i < shipSpriteData.length; i++) {
//         const enemySprite = shipSpriteData[i];
//         const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
//         if (playerShip) newEnemyShip.target = playerShip;
//         if (enemySprite.ai) {
//              newEnemyShip.aimTowards = true;
//         }
//         gameObjects.push(newEnemyShip);
//         console.log(`Enemy ship "${enemySprite.name}" created:`, newEnemyShip);
//         if (i === 1) enemyShip = newEnemyShip;
//     }
// } else {
//     console.error("Player ship sprite data not found!");
// }

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

// Function to start a new wave or the initial game setup
function initializeLevel(waveNumber) {
    console.log(`Initializing Level/Wave: ${waveNumber}`);
    // Clear existing non-player objects (asteroids, enemies, powerups, projectiles)
    // Keep playerShip if it's active, otherwise it's handled by respawn/reset.
    gameObjects = gameObjects.filter(obj => obj === playerShip && obj.isActive);

    // Spawn Asteroids
    const numAsteroids = 3 + waveNumber * 2; // Increase asteroids with waves
    if (asteroidSpriteData) {
        for (let i = 0; i < numAsteroids; i++) {
            const individualAsteroidData = {
                ...asteroidSpriteData,
                startx: Math.random() * (canvas.width / zoomLevel) * 0.8 + (canvas.width / zoomLevel * 0.1),
                starty: Math.random() * (canvas.height / zoomLevel) * 0.8 + (canvas.height / zoomLevel * 0.1),
                // Optionally, make asteroids tougher or faster in later waves
                // health: (asteroidSpriteData.health || 50) + waveNumber * 10,
            };
            gameObjects.push(new Asteroid(individualAsteroidData, canvas, ctx));
        }
    }

    // Spawn Enemies - spawn more or tougher enemies in later waves
    const enemyTypes = spriteDefinitions.sprites.filter(s => s.type === 'ship' && s.name !== (playerShip ? playerShip.spriteData.name : ""));
    const numEnemiesToSpawn = 1 + Math.floor(waveNumber / 2); // Example: more enemies every 2 waves

    for (let i = 0; i < numEnemiesToSpawn; i++) {
        if (enemyTypes.length > 0) {
            // Cycle through enemy types or pick randomly
            const enemySprite = enemyTypes[i % enemyTypes.length];
            const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
            if (playerShip) newEnemyShip.target = playerShip;
            if (enemySprite.ai) newEnemyShip.aimTowards = true;
            // Offset enemy spawn positions
            newEnemyShip.x = Math.random() * worldWidth;
            newEnemyShip.y = Math.random() * worldHeight * 0.3; // Spawn towards top
            gameObjects.push(newEnemyShip);
            if (!enemyShip && newEnemyShip.isActive) enemyShip = newEnemyShip; // Ensure enemyShip ref for zoom is set
        }
    }
    console.log(`Wave ${waveNumber} started. Game objects:`, gameObjects.length);
}

// Initial setup
let worldWidth = canvas.width / zoomLevel;
let worldHeight = canvas.height / zoomLevel;
if (currentGameState === GameState.PLAYING) {
    initializeLevel(currentWave);
    audioManager.playMusic('background');
}


let lastTime = performance.now(); // Initialize lastTime with a valid timestamp
let viewChanged = true; // Flag to recalculate world dimensions

function gameLoop(currentTime) {
    if (currentGameState === GameState.PAUSED && currentGameState !== GameState.GAME_OVER) {
        // audioManager.pauseMusic('background'); // Pausing handled in input handler
        // Draw paused screen or message
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2);
        ctx.font = '24px Arial';
        ctx.fillText('Press P or Esc to Resume', canvas.width / 2, canvas.height / 2 + 50);
        requestAnimationFrame(gameLoop);
        return;
    }
    if (currentGameState === GameState.GAME_OVER) {
        // audioManager.stopMusic('background'); // Stopping handled in state transition
        // Draw Game Over screen
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform for UI
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '60px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 50);
        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Final Score: ${score}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Restart', canvas.width / 2, canvas.height / 2 + 70);
        requestAnimationFrame(gameLoop); // Keep loop running for input check
        return;
    }
    // For TITLE_SCREEN, similar logic would go here.
    if (currentGameState === GameState.SHIP_SELECTION) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 48px Arial'; // Larger title
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT YOUR SHIP', canvas.width / 2, 80); // Position title higher

        const selectionStartY = 150;
        const selectionItemHeight = 40; // Height for each ship name in the list
        const visibleItems = 5; // Max items to show in the list area

        // Logic for a scrollable list if more ships than visibleItems (optional, for now simple list)
        selectablePlayerShips.forEach((shipSpriteData, index) => {
            const yPosName = selectionStartY + index * selectionItemHeight;
            
            if (index === currentShipSelectionIndex) {
                ctx.fillStyle = 'yellow';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`▶ ${shipSpriteData.name.replace(/_/g, ' ').toUpperCase()}`, canvas.width / 2, yPosName);

                // Display selected ship's sprite and attributes to the side or below
                const detailX = canvas.width / 2 + 200; // X position for details
                let detailY = selectionStartY - 20;

                if (shipsImage.complete && shipsImage.naturalWidth !== 0 && shipSpriteData.src === './ships.png') {
                    const previewWidth = shipSpriteData.width * 2;
                    const previewHeight = shipSpriteData.height * 2;
                    ctx.drawImage(
                        shipsImage,
                        shipSpriteData.sx, shipSpriteData.sy, shipSpriteData.sWidth, shipSpriteData.sHeight,
                        detailX - previewWidth / 2,
                        detailY,
                        previewWidth, previewHeight
                    );
                    detailY += previewHeight + 15;
                }

                ctx.font = '18px Arial';
                ctx.fillStyle = 'cyan';
                ctx.textAlign = 'left'; // Align attributes to the left

                ctx.fillText(`Health: ${shipSpriteData.health}`, detailX - 60, detailY); detailY += 22;
                ctx.fillText(`Max Speed: ${shipSpriteData.max_speed}`, detailX - 60, detailY); detailY += 22;
                ctx.fillText(`Thrust: ${shipSpriteData.thrust}`, detailX - 60, detailY); detailY += 22;
                ctx.fillText(`Agility: ${shipSpriteData.rotationSpeed.toFixed(2)}`, detailX - 60, detailY); detailY += 22;
                const defaultWpn = shipSpriteData.weapons.find(w => w.type === shipSpriteData.defaultWeaponType);
                ctx.fillText(`Weapon: ${defaultWpn ? defaultWpn.name : shipSpriteData.defaultWeaponType}`, detailX - 60, detailY); detailY += 25;
                
                ctx.fillStyle = 'lightgray';
                ctx.font = '16px Arial';
                // Word wrap for description
                const description = shipSpriteData.description || "No description available.";
                const maxDescWidth = 250;
                const words = description.split(' ');
                let line = '';
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    let testWidth = metrics.width;
                    if (testWidth > maxDescWidth && n > 0) {
                        ctx.fillText(line, detailX - 60, detailY);
                        line = words[n] + ' ';
                        detailY += 18; // Line height for description
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, detailX - 60, detailY);

            } else {
                ctx.fillStyle = 'white';
                ctx.font = '22px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(shipSpriteData.name.replace(/_/g, ' ').toUpperCase(), canvas.width / 2, yPosName);
            }
        });

        ctx.textAlign = 'center'; // Reset alignment for footer
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Use Arrow Up/Down to Select, Enter to Confirm', canvas.width / 2, canvas.height - 50);

        requestAnimationFrame(gameLoop);
        return;
    }
    else if (currentGameState === GameState.TITLE_SCREEN) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.font = '48px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 2 - 60);
        ctx.font = '24px Arial';
        ctx.fillText('Press Space to Start', canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText('Controls: Arrows to Move, Space to Shoot', canvas.width / 2, canvas.height / 2 + 60);
        ctx.fillText('1 for Laser, 2 for Plasma', canvas.width / 2, canvas.height / 2 + 100);
        ctx.fillText('M to Toggle Mute', canvas.width / 2, canvas.height / 2 + 140);
        requestAnimationFrame(gameLoop);
        return;
    }
    else if (currentGameState === GameState.PLAYER_DIED_CHOICE) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = '48px Arial';
        ctx.fillStyle = 'orange';
        ctx.textAlign = 'center';
        ctx.fillText('YOU DIED!', canvas.width / 2, canvas.height / 2 - 100);

        ctx.font = '30px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(`Lives Remaining: ${lives}`, canvas.width / 2, canvas.height / 2 - 30);

        ctx.font = '24px Arial';
        ctx.fillText('Press R to Respawn', canvas.width / 2, canvas.height / 2 + 40);
        ctx.fillText('Press E to End Game', canvas.width / 2, canvas.height / 2 + 80);

        requestAnimationFrame(gameLoop);
        return;
    }

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
    // --- PLAYER DEATH AND RESPAWN ---
    if (playerShip && !playerShip.isActive && currentGameState === GameState.PLAYING) {
        lives--;
        // playerShip.lives = lives; // This was commented out, which is fine as global 'lives' is the truth.
        console.log(`Player ship destroyed. Lives remaining: ${lives}`);
        if (lives <= 0) {
            currentGameState = GameState.GAME_OVER;
            audioManager.stopMusic('background');
            audioManager.playSound('gameOver');
            console.log("Game Over!");
        } else {
            // Transition to player died choice screen
            currentGameState = GameState.PLAYER_DIED_CHOICE;
            audioManager.pauseMusic('background'); // Pause music while choice is shown
        }
    }


    if (currentGameState === GameState.PLAYING) {
        if (playerShip) {
            playerShieldWasActive = playerShip.isShieldActive;
        }

        gameObjects.forEach(obj => {
            if (obj.isActive) {
                obj.update(deltaTime, zoomLevel);
            }
        });

        if (playerShip && playerShieldWasActive && !playerShip.isShieldActive) {
            audioManager.playSound('shieldDeactivate');
        }
        
        gameObjects.forEach(obj => {
            if (obj instanceof Spaceship && obj.bullets.length > 0) {
                // Transfer bullets from ship's local list to global gameObjects
                // Important: iterate backwards if removing or use a new array to avoid modification issues
                for (let i = obj.bullets.length - 1; i >= 0; i--) {
                    const bullet = obj.bullets[i];
                    if (!gameObjects.includes(bullet)) {
                        gameObjects.push(bullet);
                    }
                }
                obj.bullets = []; // Clear local list as they are now globally managed
            }
        });

        handleCollisions();
        gameObjects = gameObjects.filter(obj => obj.isActive);

        // Check for wave completion
        const activeEnemiesAndAsteroids = gameObjects.filter(
            obj => obj.isActive &&
                   (obj instanceof Asteroid || (obj instanceof Spaceship && obj !== playerShip))
        );
        if (activeEnemiesAndAsteroids.length === 0 && playerShip && playerShip.isActive) {
            currentWave++;
            console.log(`Wave ${currentWave -1} cleared! Starting wave ${currentWave}.`);
            initializeLevel(currentWave);
        }
    }


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

// --- DRAW UI ---
    // UI should be drawn after all game objects and not affected by game zoom/pan
    // Ensure this is called AFTER game world drawing and AFTER ctx.scale has been reset or accounted for.
    if (currentGameState === GameState.PLAYING || currentGameState === GameState.PAUSED) { // Also show UI when paused
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to draw UI in screen space

        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left';
        ctx.fillText(`Score: ${score}`, 20, 30);
        ctx.fillText(`Lives: ${lives}`, 20, 60);

        if (playerShip && playerShip.isShieldActive) {
            ctx.fillStyle = 'cyan';
            ctx.fillText(`Shield: ${Math.ceil(playerShip.shieldTimer)}s`, 20, 90);
        }
    }
    // --- END DRAW UI ---
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
                if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner === playerShip && obj2 instanceof Asteroid) {
                    const asteroidWasActive = obj2.isActive;
                    obj2.takeDamage(obj1.damage);
                    audioManager.playSound('hitDamage');
                    obj1.onHit(obj2); // Projectile handles its own deactivation
                    if (asteroidWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 10);
                        audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall'); // Check type for sound
                        console.log("main.js: handleCollisions - About to call obj2.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                        const newObjects = obj2.onDestruction(spriteDefinitions); // Pass spriteDefinitions
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects); // Add all new objects
                        }
                    }
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj2.owner === playerShip && obj1 instanceof Asteroid) {
                    const asteroidWasActive = obj1.isActive;
                    obj1.takeDamage(obj2.damage);
                    audioManager.playSound('hitDamage');
                    obj2.onHit(obj1);
                    if (asteroidWasActive && !obj1.isActive) {
                        addScore(obj1.spriteData.points || 10);
                        audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall'); // Check type for sound
                        console.log("main.js: handleCollisions - About to call obj1.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                        const newObjects = obj1.onDestruction(spriteDefinitions); // Pass spriteDefinitions
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects); // Add all new objects
                        }
                    }
                }

                // Projectile vs Enemy Spaceship (ensure projectile belongs to player)
                else if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner === playerShip && obj2 instanceof Spaceship && obj2 !== playerShip) {
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(obj1.damage);
                    audioManager.playSound('hitDamage');
                    obj1.onHit(obj2);
                    if (enemyWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 50);
                        audioManager.playSound('explosionSmall'); // Assuming enemy ships are smaller explosions
                        // const newPowerUp = obj2.onDestruction();
                        // if (newPowerUp) { gameObjects.push(newPowerUp); }
                    }
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj2.owner === playerShip && obj1 instanceof Spaceship && obj1 !== playerShip) {
                    const enemyWasActive = obj1.isActive;
                    obj1.takeDamage(obj2.damage);
                    audioManager.playSound('hitDamage');
                    obj2.onHit(obj1);
                    if (enemyWasActive && !obj1.isActive) {
                        addScore(obj1.spriteData.points || 50);
                        audioManager.playSound('explosionSmall');
                    }
                }
                
                // PlayerShip vs Asteroid
                else if (obj1 === playerShip && obj2 instanceof Asteroid) {
                    if (!playerShip.isShieldActive && playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj2)) {
                         playerShip.takeDamage(20); // Damage amount
                         audioManager.playSound('hitDamage');
                         const asteroidWasActive = obj2.isActive;
                         obj2.takeDamage(100); // Asteroids take more damage from collision
                         if (asteroidWasActive && !obj2.isActive) {
                            audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                            console.log("main.js: handleCollisions (player vs asteroid) - About to call obj2.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                            const newObjects = obj2.onDestruction(spriteDefinitions);
                            if (newObjects && newObjects.length > 0) {
                                gameObjects.push(...newObjects);
                            }
                        }
                    }
                } else if (obj2 === playerShip && obj1 instanceof Asteroid) {
                     if (!playerShip.isShieldActive && playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj1)) {
                        playerShip.takeDamage(20);
                        audioManager.playSound('hitDamage');
                        const asteroidWasActive = obj1.isActive;
                        obj1.takeDamage(100);
                        if (asteroidWasActive && !obj1.isActive) {
                            audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                            console.log("main.js: handleCollisions (player vs asteroid) - About to call obj1.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                            const newObjects = obj1.onDestruction(spriteDefinitions);
                            if (newObjects && newObjects.length > 0) {
                                gameObjects.push(...newObjects);
                            }
                        }
                    }
                }

                // PlayerShip vs PowerUp
                else if (obj1 === playerShip && obj2 instanceof PowerUp) {
                    obj2.onCollected(playerShip);
                    audioManager.playSound('powerupCollect');
                } else if (obj2 === playerShip && obj1 instanceof PowerUp) {
                    obj1.onCollected(playerShip);
                    audioManager.playSound('powerupCollect');
                }
                
                // Enemy Projectile vs PlayerShip
                else if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner !== playerShip && obj2 === playerShip) {
                    if (!playerShip.isShieldActive) {
                        playerShip.takeDamage(obj1.damage);
                        audioManager.playSound('hitDamage');
                    }
                    obj1.onHit(obj2); // Projectile deactivates
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj2.owner !== playerShip && obj1 === playerShip) {
                     if (!playerShip.isShieldActive) {
                        playerShip.takeDamage(obj2.damage);
                        audioManager.playSound('hitDamage');
                    }
                    obj2.onHit(obj1);
                }

                // Enemy Spaceship vs Asteroid
                else if (obj1 instanceof Spaceship && obj1 !== playerShip && obj2 instanceof Asteroid) {
                    // Enemy ship takes some damage, asteroid takes significant damage or is destroyed
                    const enemyWasActive = obj1.isActive;
                    obj1.takeDamage(15); // Enemy ship takes minor collision damage
                    audioManager.playSound('hitDamage'); // Generic hit sound

                    const asteroidWasActive = obj2.isActive;
                    obj2.takeDamage(50); // Asteroid takes more damage

                    if (asteroidWasActive && !obj2.isActive) {
                        // Score for player if enemy indirectly caused asteroid destruction? For now, no.
                        audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                        console.log("main.js: handleCollisions (enemy vs asteroid) - About to call obj2.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                        const newObjects = obj2.onDestruction(spriteDefinitions);
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects);
                        }
                    }
                    if (enemyWasActive && !obj1.isActive) {
                        // No score for player if enemy ship destroys itself by ramming asteroid
                        audioManager.playSound('explosionSmall');
                    }
                } else if (obj2 instanceof Spaceship && obj2 !== playerShip && obj1 instanceof Asteroid) {
                    // Symmetric case
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(15);
                    audioManager.playSound('hitDamage');

                    const asteroidWasActive = obj1.isActive;
                    obj1.takeDamage(50);

                    if (asteroidWasActive && !obj1.isActive) {
                        audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                        console.log("main.js: handleCollisions (asteroid vs enemy) - About to call obj1.onDestruction. spriteDefinitions:", JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG
                        const newObjects = obj1.onDestruction(spriteDefinitions);
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects);
                        }
                    }
                    if (enemyWasActive && !obj2.isActive) {
                        audioManager.playSound('explosionSmall');
                    }
                }

                // Player Ship vs Enemy Ship
                else if ((obj1 === playerShip && obj2 instanceof Spaceship && obj2 !== playerShip)) {
                    if (!playerShip.isShieldActive) {
                        playerShip.takeDamage(25); // Player takes damage
                        audioManager.playSound('hitDamage');
                    }
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(25); // Enemy also takes damage
                    if (enemyWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 50); // Score for ramming kill
                        audioManager.playSound('explosionSmall');
                    }
                } else if ((obj2 === playerShip && obj1 instanceof Spaceship && obj1 !== playerShip)) {
                    // Symmetric case
                    if (!playerShip.isShieldActive) {
                        playerShip.takeDamage(25);
                        audioManager.playSound('hitDamage');
                    }
                    const enemyWasActive = obj1.isActive;
                    obj1.takeDamage(25);
                    if (enemyWasActive && !obj1.isActive) {
                        addScore(obj1.spriteData.points || 50);
                        audioManager.playSound('explosionSmall');
                    }
                }

                // Potentially other Spaceship vs Spaceship (e.g. enemy vs enemy, friendly fire off)
                // For now, this is simple. More complex rules can be added.
            }
        }
    }
}

function addScore(points) {
    score += points;
    console.log(`Score: ${score}`);
    // Later, update UI element for score here
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
    if (currentGameState === GameState.SHIP_SELECTION) {
        if (e.code === 'ArrowUp') {
            currentShipSelectionIndex = (currentShipSelectionIndex - 1 + selectablePlayerShips.length) % selectablePlayerShips.length;
            selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
        } else if (e.code === 'ArrowDown') {
            currentShipSelectionIndex = (currentShipSelectionIndex + 1) % selectablePlayerShips.length;
            selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
        } else if (e.code === 'Enter') {
            if (selectablePlayerShips.length > 0) {
                selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
                console.log(`Player selected ship: ${selectedPlayerSpriteName}`);
                currentGameState = GameState.TITLE_SCREEN;
                // Game objects including playerShip will be initialized in resetGame(),
                // which is called when transitioning from TITLE_SCREEN to PLAYING.
            }
        }
        return;
    }
    else if (currentGameState === GameState.TITLE_SCREEN) {
        if (e.code === 'Space') {
            currentGameState = GameState.PLAYING;
            resetGame(); // Reset game to initial state before starting
            audioManager.playMusic('background');
            console.log("Game Started from Title Screen");
        }
        return;
    }
    else if (currentGameState === GameState.PLAYER_DIED_CHOICE) {
        if (e.code === 'KeyR') { // Respawn
            respawnPlayer();
            currentGameState = GameState.PLAYING;
            audioManager.resumeMusic('background');
            lastTime = performance.now(); // Avoid deltaTime jump
        } else if (e.code === 'KeyE') { // End Game
            currentGameState = GameState.GAME_OVER;
            audioManager.stopMusic('background'); // Ensure music stops
            audioManager.playSound('gameOver'); // Play game over sound
            console.log("Game Ended by player choice.");
        }
        return;
    }

    if (currentGameState === GameState.GAME_OVER) {
        if (e.code === 'KeyR') {
            // When restarting from Game Over, go through ship selection again.
            initializeShipSelection(); // Re-initialize for potential different ship choice
            currentGameState = GameState.SHIP_SELECTION;
            console.log("Restarting to Ship Selection Screen from Game Over");
        }
        return;
    }

    if (e.code === 'KeyP' || e.code === 'Escape') {
        if (currentGameState === GameState.PLAYING) {
            currentGameState = GameState.PAUSED;
            audioManager.pauseMusic('background');
            console.log("Game Paused");
        } else if (currentGameState === GameState.PAUSED) {
            currentGameState = GameState.PLAYING;
            audioManager.resumeMusic('background');
            lastTime = performance.now(); // Reset lastTime to avoid large deltaTime jump
            console.log("Game Resumed");
        }
        return;
    }

    if (e.code === 'KeyM') { // Mute toggle
        audioManager.toggleMute();
    }

    if (currentGameState !== GameState.PLAYING) return;
    if (!playerShip || !playerShip.isActive) return;

    const thrustAmount = 200; // Pixels per second^2 or a direct momentum change factor

    switch (e.code) {
        case 'ArrowUp':
            if (playerShip) playerShip.isThrusting = true;
            break;
        case 'ArrowLeft':
            // rotationSpeed should be defined in spriteData (radians per second)
            playerShip.rotationSpeed = -(playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'ArrowRight':
            playerShip.rotationSpeed = (playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'Space':
            const projectileType = playerShip.shoot(); // shoot() should return info about shot
            if (projectileType === 'laser') {
                audioManager.playSound('playerShootLaser');
            } else if (projectileType === 'plasma') {
                audioManager.playSound('playerShootPlasma');
            } else if (projectileType) { // Generic shoot sound if type not specified
                audioManager.playSound('playerShootLaser'); // Default to laser sound
            }
            break;
        case 'Digit1': // Equip LaserWeapon
            if (playerShip) {
                playerShip.equipWeapon('laser'); // Pass weapon type string
                // console.log("Attempted to equip Laser Weapon via keypress"); // Logging is now in equipWeapon
            }
            break;
        case 'Digit2': // Equip PlasmaWeapon
            if (playerShip) {
                playerShip.equipWeapon('plasma'); // Pass weapon type string
                // console.log("Attempted to equip Plasma Weapon via keypress");
            }
            break;
    }
});

document.addEventListener('keyup', (e) => {
    if (!playerShip || !playerShip.isActive) return;

    switch (e.code) {
        case 'ArrowUp':
            if (playerShip) playerShip.isThrusting = false;
            break;
        case 'ArrowLeft':
        case 'ArrowRight':
            playerShip.rotationSpeed = 0;
            break;
    }
});

// Start the game loop
requestAnimationFrame(gameLoop);

function respawnPlayer() {
    if (!playerShip) {
        console.error("Cannot respawn: playerShip is null or undefined!");
        currentGameState = GameState.GAME_OVER; // Critical error
        return;
    }
    // Ensure playerShip.spriteData is available
    if (!playerShip.spriteData || !playerShip.spriteData.name) {
        console.error("Cannot respawn: playerShip.spriteData or playerShip.spriteData.name is missing!");
        // Attempt a very generic respawn
        playerShip.x = canvas.width / zoomLevel / 2;
        playerShip.y = canvas.height / zoomLevel / 2;
        playerShip.health = 100; // Default health
        playerShip.momentumX = 0;
        playerShip.momentumY = 0;
        playerShip.angle = 0;
        playerShip.isActive = true;
        playerShip.activateShield(3);
        audioManager.playSound('playerRespawn');
        audioManager.playSound('shieldActivate');
        console.warn("Player respawned with default values due to missing spriteData.");
        return;
    }

    audioManager.playSound('playerRespawn');
    const playerSpriteDefToRespawn = spriteDefinitions.sprites.find(s => s.name === playerShip.spriteData.name);

    if (playerSpriteDefToRespawn) {
        playerShip.x = playerSpriteDefToRespawn.startx || canvas.width / zoomLevel / 2;
        playerShip.y = playerSpriteDefToRespawn.starty || canvas.height / zoomLevel / 2;
        playerShip.health = playerSpriteDefToRespawn.health || 100;
        playerShip.momentumX = 0;
        playerShip.momentumY = 0;
        playerShip.angle = 0;
        playerShip.isActive = true;
        playerShip.activateShield(3); // Brief invulnerability
        audioManager.playSound('shieldActivate');
        console.log("Player respawned using sprite definition:", playerSpriteDefToRespawn.name);
    } else {
        console.error("Could not find player sprite definition for respawn:", playerShip.spriteData.name);
        // Fallback: try to reset to a generic state if specific def fails
        playerShip.x = canvas.width / zoomLevel / 2;
        playerShip.y = canvas.height / zoomLevel / 2;
        playerShip.health = 100; // Default health
        playerShip.isActive = true;
        playerShip.activateShield(3);
        console.warn("Player respawned with default values as specific definition was not found.");
    }
    // Ensure playerShip is in gameObjects if it was somehow removed (though it shouldn't be if only isActive is false)
    if (!gameObjects.includes(playerShip)) {
        console.warn("Player ship was not in gameObjects during respawn. Adding it back.");
        gameObjects.push(playerShip);
    }
}

function resetGame() {
    console.log("Resetting game...");
    score = 0;
    lives = 3;
    gameObjects = []; // Clear all game objects

    // Re-initialize player
    // Use the globally selected player ship name, or fallback to the first selectable ship.
    const finalSelectedPlayerSpriteName = selectedPlayerSpriteName || (selectablePlayerShips.length > 0 ? selectablePlayerShips[0].name : null);

    if (!finalSelectedPlayerSpriteName) {
        console.error("CRITICAL: No player ship selected or available for resetGame!");
        // Potentially set a default or throw an error
        // For now, try to find *any* non-AI ship as an absolute fallback.
        const anyPlayerShipDef = spriteDefinitions.sprites.find(s => s.type === 'ship' && !s.ai);
        if (anyPlayerShipDef) {
            playerShip = new Spaceship(anyPlayerShipDef, canvas, ctx);
        } else {
            // If still no ship, this is a critical setup error.
            console.error("CRITICAL FALLBACK: No suitable player ship definition found in sprites.js for resetGame.");
            // As a last resort, if spriteDefinitions.sprites[0] is a ship, use it.
            if (spriteDefinitions.sprites.length > 0 && spriteDefinitions.sprites[0].type === 'ship') {
                playerShip = new Spaceship(spriteDefinitions.sprites[0], canvas, ctx);
            } else {
                // Game cannot start without a player ship.
                alert("Error: Could not initialize player ship. Game cannot start.");
                currentGameState = GameState.GAME_OVER; // Or some error state
                return;
            }
        }
    } else {
        const playerSpriteDef = spriteDefinitions.sprites.find(s => s.name === finalSelectedPlayerSpriteName);
        if (playerSpriteDef) {
            playerShip = new Spaceship(playerSpriteDef, canvas, ctx);
        } else {
            console.error(`Failed to find selected player sprite definition "${finalSelectedPlayerSpriteName}" for reset! Defaulting...`);
            // Fallback to the first selectable ship if the named one isn't found (should not happen if selection logic is correct)
            playerShip = new Spaceship(selectablePlayerShips[0], canvas, ctx);
        }
    }

    playerShip.lives = lives;
    gameObjects.push(playerShip);
    console.log("Player ship initialized in resetGame:", playerShip.spriteData.name);

    // Re-initialize enemies
    const enemySpriteDefs = spriteDefinitions.sprites.filter(s => s.type === 'ship' && s.ai); // Only AI ships are enemies
    enemySpriteDefs.forEach((enemySprite, i) => {
        const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
        if (playerShip) newEnemyShip.target = playerShip;
        if (enemySprite.ai) newEnemyShip.aimTowards = true;
        gameObjects.push(newEnemyShip);
        if (i === 0) enemyShip = newEnemyShip; // Update enemyShip reference for zoom
    });


    // Re-initialize asteroids
    if (asteroidSpriteData) {
        for (let i = 0; i < 5; i++) {
            const individualAsteroidData = {
                ...asteroidSpriteData,
                startx: Math.random() * (canvas.width / zoomLevel) * 0.8 + (canvas.width / zoomLevel * 0.1),
                starty: Math.random() * (canvas.height / zoomLevel) * 0.8 + (canvas.height / zoomLevel * 0.1)
            };
            gameObjects.push(new Asteroid(individualAsteroidData, canvas, ctx));
        }
    }
    
    currentWave = 0; // Reset wave number
    initializeLevel(currentWave); // Initialize first wave
    currentGameState = GameState.PLAYING;
    lastTime = performance.now(); // Reset lastTime for the new game
    viewChanged = true; // Force view recalculation
    console.log("Game reset complete. Initial gameObjects:", gameObjects);
}