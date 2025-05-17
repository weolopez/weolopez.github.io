import { Spaceship } from './spaceship.js';
import { Asteroid } from './asteroid.js';
import { StarField } from './star-field.js';
import { Sprites } from './sprites.js';
import { LaserProjectile } from './bullet.js';
import { PlasmaProjectile } from './PlasmaProjectile.js';
import { LaserWeapon } from './LaserWeapon.js';
import { PlasmaWeapon } from './PlasmaWeapon.js';
import { PowerUp } from './PowerUp.js';
import { ShieldInvulnerabilityPowerUp } from './ShieldInvulnerabilityPowerUp.js';
import AudioManager from './AudioManager.js';

let spriteDefinitions = new Sprites();
let audioManager = new AudioManager();

const shipsImage = new Image();
shipsImage.src = './ships.png';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

canvas.style.position = 'absolute';
canvas.style.top = '0';
canvas.style.left = '0';

const ZOOM_LEVELS = {
    CLOSE: 0.8,
    MID: 0.5,
    FAR: 0.25
};
let actualZoomLevel = ZOOM_LEVELS.MID;
let currentTargetZoom = ZOOM_LEVELS.MID;
const ZOOM_SMOOTH_FACTOR = 0.05;

let starField = new StarField(canvas, ctx);
starField.initBackgroundElements(actualZoomLevel);

let gameObjects = [];
let playerShip;
let enemyShip; 
let score = 0;
let lives = 3;

const GameState = {
    SHIP_SELECTION: 'ship_selection',
    TITLE_SCREEN: 'title_screen',
    PLAYING: 'playing',
    GAME_OVER: 'game_over',
    PAUSED: 'paused',
    PLAYER_DIED_CHOICE: 'player_died_choice'
};
let currentGameState = GameState.SHIP_SELECTION;

let selectablePlayerShips = [];
let currentShipSelectionIndex = 0;
let selectedPlayerSpriteName = null;

function initializeShipSelection() {
    selectablePlayerShips = spriteDefinitions.sprites.filter(
        s => s.type === 'ship' && !s.ai
    );
    if (selectablePlayerShips.length === 0) {
        console.error("No selectable player ships found! Defaulting.");
        const allShips = spriteDefinitions.sprites.filter(s => s.type === 'ship');
        if (allShips.length > 0) selectablePlayerShips.push(allShips[0]);
        else console.error("CRITICAL: No ship definitions found!");
    }
    if (!selectedPlayerSpriteName && selectablePlayerShips.length > 0) {
        selectedPlayerSpriteName = selectablePlayerShips[0].name;
    }
    currentShipSelectionIndex = Math.max(0, selectablePlayerShips.findIndex(s => s.name === selectedPlayerSpriteName));
}

initializeShipSelection();

let currentWave = 0;
let playerShieldWasActive = false;

let worldWidth = canvas.width / actualZoomLevel;
let worldHeight = canvas.height / actualZoomLevel;

const baseAsteroidSpriteData = spriteDefinitions.sprites.find(s => s.type === 'asteroid_large');

if (baseAsteroidSpriteData) {
    for (let i = 0; i < 5; i++) { // Initial asteroids
        const individualAsteroidData = {
            ...baseAsteroidSpriteData,
            startx: Math.random() * (canvas.width / actualZoomLevel) * 0.8 + (canvas.width / actualZoomLevel * 0.1),
            starty: Math.random() * (canvas.height / actualZoomLevel) * 0.8 + (canvas.height / actualZoomLevel * 0.1)
        };
        gameObjects.push(new Asteroid(individualAsteroidData, canvas, ctx));
    }
} else {
    console.error("Initial large asteroid sprite data not found!");
}


function initializeLevel(waveNumber) {
    console.log(`Initializing Level/Wave: ${waveNumber}`);
    const player = gameObjects.find(obj => obj === playerShip);
    gameObjects = player && player.isActive ? [player] : [];

    const numAsteroids = 3 + waveNumber * 2;
    if (baseAsteroidSpriteData) {
        for (let i = 0; i < numAsteroids; i++) {
            const individualAsteroidData = {
                ...baseAsteroidSpriteData,
                startx: Math.random() * (worldWidth * 0.8) + (worldWidth * 0.1),
                starty: Math.random() * (worldHeight * 0.8) + (worldHeight * 0.1),
            };
            gameObjects.push(new Asteroid(individualAsteroidData, canvas, ctx));
        }
    }

    const enemySpritePool = spriteDefinitions.sprites.filter(s => s.type === 'ship' && s.ai);
    const numEnemiesToSpawn = 1 + Math.floor(waveNumber / 2);

    for (let i = 0; i < numEnemiesToSpawn; i++) {
        if (enemySpritePool.length > 0) {
            const enemySprite = enemySpritePool[i % enemySpritePool.length];
            const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
            if (playerShip) newEnemyShip.target = playerShip;
            newEnemyShip.x = Math.random() * worldWidth;
            newEnemyShip.y = Math.random() * worldHeight * 0.3;
            gameObjects.push(newEnemyShip);
            // Update general enemyShip reference if needed for old zoom logic (though new zoom is preferred)
            if (i === 0) { // Simple way to get a reference to an enemy
                 const firstActiveEnemy = gameObjects.find(obj => obj instanceof Spaceship && obj !== playerShip && obj.isActive);
                 enemyShip = firstActiveEnemy;
            }
        }
    }
    console.log(`Wave ${waveNumber} started. Game objects:`, gameObjects.length);
}

function lerp(start, end, amt) {
    return start + (end - start) * amt;
}

function determineTargetZoomLevel() {
    if (!playerShip || !playerShip.isActive) return ZOOM_LEVELS.MID;

    const activeEnemies = gameObjects.filter(obj => obj instanceof Spaceship && obj !== playerShip && obj.isActive);
    
    if (activeEnemies.length === 0) {
        const nearbyAsteroids = gameObjects.filter(obj => obj instanceof Asteroid && obj.isActive && 
            Math.sqrt((obj.x - playerShip.x)**2 + (obj.y - playerShip.y)**2) < 300 / actualZoomLevel);
        return nearbyAsteroids.length > 2 ? ZOOM_LEVELS.MID : ZOOM_LEVELS.CLOSE;
    }

    let minX = playerShip.x, maxX = playerShip.x, minY = playerShip.y, maxY = playerShip.y;

    activeEnemies.sort((a, b) => {
        const distA = Math.sqrt((a.x - playerShip.x)**2 + (a.y - playerShip.y)**2);
        const distB = Math.sqrt((b.x - playerShip.x)**2 + (b.y - playerShip.y)**2);
        return distA - distB;
    });

    const enemiesToConsider = activeEnemies.slice(0, 3); 

    enemiesToConsider.forEach(enemy => {
        minX = Math.min(minX, enemy.x - enemy.width / 2);
        maxX = Math.max(maxX, enemy.x + enemy.width / 2);
        minY = Math.min(minY, enemy.y - enemy.height / 2);
        maxY = Math.max(maxY, enemy.y + enemy.height / 2);
    });
    minX = Math.min(minX, playerShip.x - playerShip.width / 2);
    maxX = Math.max(maxX, playerShip.x + playerShip.width / 2);
    minY = Math.min(minY, playerShip.y - playerShip.height / 2);
    maxY = Math.max(maxY, playerShip.y + playerShip.height / 2);

    const boundingBoxWidth = Math.max(maxX - minX, playerShip.width * 4);
    const boundingBoxHeight = Math.max(maxY - minY, playerShip.height * 4);

    const zoomToFitX = canvas.width / boundingBoxWidth;
    const zoomToFitY = canvas.height / boundingBoxHeight;
    let requiredZoom = Math.min(zoomToFitX, zoomToFitY) * 0.85; 

    requiredZoom = Math.max(ZOOM_LEVELS.FAR, Math.min(requiredZoom, ZOOM_LEVELS.CLOSE));

    if (activeEnemies.length > 2 && requiredZoom < ZOOM_LEVELS.MID) {
        return ZOOM_LEVELS.FAR;
    } else if (activeEnemies.length === 1 && requiredZoom > ZOOM_LEVELS.MID) {
         const distToEnemy = Math.sqrt((activeEnemies[0].x - playerShip.x)**2 + (activeEnemies[0].y - playerShip.y)**2);
         if (distToEnemy < (250 / actualZoomLevel)) return ZOOM_LEVELS.CLOSE;
         return ZOOM_LEVELS.MID;
    } else if (requiredZoom < ZOOM_LEVELS.FAR * 1.2) { 
        return ZOOM_LEVELS.FAR;
    } else if (requiredZoom > ZOOM_LEVELS.CLOSE * 0.8) { 
        return ZOOM_LEVELS.CLOSE;
    }
    
    return ZOOM_LEVELS.MID;
}

let lastTime = performance.now();
let viewChanged = true; 

function gameLoop(currentTime) {
    if (currentGameState === GameState.PAUSED && currentGameState !== GameState.GAME_OVER) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        ctx.setTransform(1, 0, 0, 1, 0, 0);
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
        requestAnimationFrame(gameLoop);
        return;
    }
    if (currentGameState === GameState.SHIP_SELECTION) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = 'bold 48px Arial'; 
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('SELECT YOUR SHIP', canvas.width / 2, 80); 

        const selectionStartY = 150;
        const selectionItemHeight = 40; 
        
        selectablePlayerShips.forEach((shipSpriteData, index) => {
            const yPosName = selectionStartY + index * selectionItemHeight;
            
            if (index === currentShipSelectionIndex) {
                ctx.fillStyle = 'yellow';
                ctx.font = 'bold 24px Arial';
                ctx.fillText(`▶ ${shipSpriteData.name.replace(/_/g, ' ').toUpperCase()}`, canvas.width / 2, yPosName);

                const detailX = canvas.width * 0.75; 
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
                ctx.textAlign = 'left'; 

                ctx.fillText(`Health: ${shipSpriteData.health}`, detailX - 100, detailY); detailY += 22;
                ctx.fillText(`Max Speed: ${shipSpriteData.max_speed}`, detailX - 100, detailY); detailY += 22;
                ctx.fillText(`Thrust: ${shipSpriteData.thrust}`, detailX - 100, detailY); detailY += 22;
                ctx.fillText(`Agility: ${shipSpriteData.rotationSpeed.toFixed(2)}`, detailX - 100, detailY); detailY += 22;
                const defaultWpn = shipSpriteData.weapons.find(w => w.type === shipSpriteData.defaultWeaponType);
                ctx.fillText(`Weapon: ${defaultWpn ? defaultWpn.name : shipSpriteData.defaultWeaponType}`, detailX - 100, detailY); detailY += 25;
                
                ctx.fillStyle = 'lightgray';
                ctx.font = '16px Arial';
                const description = shipSpriteData.description || "No description available.";
                const maxDescWidth = 200;
                const words = description.split(' ');
                let line = '';
                for(let n = 0; n < words.length; n++) {
                    let testLine = line + words[n] + ' ';
                    let metrics = ctx.measureText(testLine);
                    let testWidth = metrics.width;
                    if (testWidth > maxDescWidth && n > 0) {
                        ctx.fillText(line, detailX - 100, detailY);
                        line = words[n] + ' ';
                        detailY += 18; 
                    } else {
                        line = testLine;
                    }
                }
                ctx.fillText(line, detailX - 100, detailY);

            } else {
                ctx.fillStyle = 'white';
                ctx.font = '22px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(shipSpriteData.name.replace(/_/g, ' ').toUpperCase(), canvas.width / 2, yPosName);
            }
        });

        ctx.textAlign = 'center'; 
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

    let deltaTime = (currentTime - lastTime) / 1000; 
    if (deltaTime > 0.1) { 
        deltaTime = 0.1;
    }
    lastTime = currentTime;

    if (deltaTime <= 0) { 
        requestAnimationFrame(gameLoop);
        return;
    }

    // Update zoom level
    if (currentGameState === GameState.PLAYING) {
        currentTargetZoom = determineTargetZoomLevel();
    } else if (currentGameState === GameState.SHIP_SELECTION || 
               currentGameState === GameState.TITLE_SCREEN || 
               currentGameState === GameState.GAME_OVER ||
               currentGameState === GameState.PLAYER_DIED_CHOICE) {
        currentTargetZoom = 1.0; 
    }
    
    const oldZoom = actualZoomLevel;
    actualZoomLevel = lerp(actualZoomLevel, currentTargetZoom, ZOOM_SMOOTH_FACTOR);

    if (Math.abs(oldZoom - actualZoomLevel) > 0.001) { 
        viewChanged = true;
        if(starField) starField.setZoomLevel(actualZoomLevel); 
    }

    if (viewChanged) {
        worldWidth = canvas.width / actualZoomLevel;
        worldHeight = canvas.height / actualZoomLevel;
        viewChanged = false; 
    }

    // --- UPDATE ---
    if (playerShip && !playerShip.isActive && currentGameState === GameState.PLAYING) {
        lives--; 
        console.log(`Player ship destroyed. Lives remaining: ${lives}`);
        if (lives <= 0) {
            currentGameState = GameState.GAME_OVER;
            audioManager.stopMusic('background');
            audioManager.playSound('gameOver');
            console.log("Game Over!");
        } else {
            currentGameState = GameState.PLAYER_DIED_CHOICE;
            audioManager.pauseMusic('background'); 
        }
    }


    if (currentGameState === GameState.PLAYING) {
        if (playerShip) {
            playerShieldWasActive = playerShip.isShieldActive;
        }

        gameObjects.forEach(obj => {
            if (obj.isActive) {
                obj.update(deltaTime, actualZoomLevel); 
            }
        });

        if (playerShip && playerShieldWasActive && !playerShip.isShieldActive) {
            audioManager.playSound('shieldDeactivate');
        }
        
        gameObjects.forEach(obj => {
            if (obj instanceof Spaceship && obj.bullets.length > 0) {
                for (let i = obj.bullets.length - 1; i >= 0; i--) {
                    const bullet = obj.bullets[i];
                    if (!gameObjects.includes(bullet)) {
                        gameObjects.push(bullet);
                    }
                }
                obj.bullets = []; 
            }
        });

        handleCollisions();
        gameObjects = gameObjects.filter(obj => obj.isActive);

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
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.scale(actualZoomLevel, actualZoomLevel);   
    ctx.clearRect(0, 0, worldWidth, worldHeight); 

    if(starField) {
        starField.update(deltaTime, actualZoomLevel); 
        starField.draw(); 
    }

    gameObjects.forEach(obj => {
        if (obj.isActive) {
            obj.draw();
        }
    });

// --- DRAW UI ---
    if (currentGameState === GameState.PLAYING || currentGameState === GameState.PAUSED) { 
        ctx.setTransform(1, 0, 0, 1, 0, 0); 

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
    requestAnimationFrame(gameLoop);
}

function handleCollisions() {
    for (let i = 0; i < gameObjects.length; i++) {
        for (let j = i + 1; j < gameObjects.length; j++) {
            const obj1 = gameObjects[i];
            const obj2 = gameObjects[j];

            if (!obj1 || !obj2 || !obj1.isActive || !obj2.isActive) continue;

            if (obj1.checkCollisionWith(obj2)) {
                // Projectile vs Asteroid
                if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner === playerShip && obj2 instanceof Asteroid) {
                    const asteroidWasActive = obj2.isActive;
                    obj2.takeDamage(obj1.damage);
                    audioManager.playSound('hitDamage');
                    obj1.onHit(obj2); 
                    if (asteroidWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 10);
                        audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall'); 
                        const newObjects = obj2.onDestruction(spriteDefinitions); 
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects); 
                        }
                    }
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj2.owner === playerShip && obj1 instanceof Asteroid) {
                    const asteroidWasActive = obj1.isActive;
                    obj1.takeDamage(obj2.damage);
                    audioManager.playSound('hitDamage');
                    obj2.onHit(obj1);
                    if (asteroidWasActive && !obj1.isActive) {
                        addScore(obj1.spriteData.points || 10);
                        audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall'); 
                        const newObjects = obj1.onDestruction(spriteDefinitions); 
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects); 
                        }
                    }
                }

                // Projectile vs Enemy Spaceship
                else if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner === playerShip && obj2 instanceof Spaceship && obj2 !== playerShip) {
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(obj1.damage);
                    audioManager.playSound('hitDamage');
                    obj1.onHit(obj2);
                    if (enemyWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 50);
                        audioManager.playSound('explosionSmall'); 
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
                    if (playerShip && !playerShip.isShieldActive && playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj2)) {
                         playerShip.takeDamage(20); 
                         audioManager.playSound('hitDamage');
                         const asteroidWasActive = obj2.isActive;
                         obj2.takeDamage(100); 
                         if (asteroidWasActive && !obj2.isActive) {
                            audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                            const newObjects = obj2.onDestruction(spriteDefinitions);
                            if (newObjects && newObjects.length > 0) {
                                gameObjects.push(...newObjects);
                            }
                        }
                    }
                } else if (obj2 === playerShip && obj1 instanceof Asteroid) {
                     if (playerShip && !playerShip.isShieldActive && playerShip.collidesWithAsteroid && playerShip.collidesWithAsteroid(obj1)) {
                        playerShip.takeDamage(20);
                        audioManager.playSound('hitDamage');
                        const asteroidWasActive = obj1.isActive;
                        obj1.takeDamage(100);
                        if (asteroidWasActive && !obj1.isActive) {
                            audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                            const newObjects = obj1.onDestruction(spriteDefinitions);
                            if (newObjects && newObjects.length > 0) {
                                gameObjects.push(...newObjects);
                            }
                        }
                    }
                }

                // PlayerShip vs PowerUp
                else if (obj1 === playerShip && obj2 instanceof PowerUp) {
                    if(playerShip) obj2.onCollected(playerShip);
                    audioManager.playSound('powerupCollect');
                } else if (obj2 === playerShip && obj1 instanceof PowerUp) {
                    if(playerShip) obj1.onCollected(playerShip);
                    audioManager.playSound('powerupCollect');
                }
                
                // Enemy Projectile vs PlayerShip
                else if ((obj1 instanceof LaserProjectile || obj1 instanceof PlasmaProjectile) && obj1.owner !== playerShip && obj2 === playerShip) {
                    if (playerShip && !playerShip.isShieldActive) {
                        playerShip.takeDamage(obj1.damage);
                        audioManager.playSound('hitDamage');
                    }
                    obj1.onHit(obj2); 
                } else if ((obj2 instanceof LaserProjectile || obj2 instanceof PlasmaProjectile) && obj2.owner !== playerShip && obj1 === playerShip) {
                     if (playerShip && !playerShip.isShieldActive) {
                        playerShip.takeDamage(obj2.damage);
                        audioManager.playSound('hitDamage');
                    }
                    obj2.onHit(obj1);
                }

                // Enemy Spaceship vs Asteroid
                else if (obj1 instanceof Spaceship && obj1 !== playerShip && obj2 instanceof Asteroid) {
                    const enemyWasActive = obj1.isActive;
                    obj1.takeDamage(15); 
                    audioManager.playSound('hitDamage'); 

                    const asteroidWasActive = obj2.isActive;
                    obj2.takeDamage(50); 

                    if (asteroidWasActive && !obj2.isActive) {
                        audioManager.playSound(obj2.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                        const newObjects = obj2.onDestruction(spriteDefinitions);
                        if (newObjects && newObjects.length > 0) {
                            gameObjects.push(...newObjects);
                        }
                    }
                    if (enemyWasActive && !obj1.isActive) {
                        audioManager.playSound('explosionSmall');
                    }
                } else if (obj2 instanceof Spaceship && obj2 !== playerShip && obj1 instanceof Asteroid) {
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(15);
                    audioManager.playSound('hitDamage');

                    const asteroidWasActive = obj1.isActive;
                    obj1.takeDamage(50);

                    if (asteroidWasActive && !obj1.isActive) {
                        audioManager.playSound(obj1.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
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
                    if (playerShip && !playerShip.isShieldActive) {
                        playerShip.takeDamage(25); 
                        audioManager.playSound('hitDamage');
                    }
                    const enemyWasActive = obj2.isActive;
                    obj2.takeDamage(25); 
                    if (enemyWasActive && !obj2.isActive) {
                        addScore(obj2.spriteData.points || 50); 
                        audioManager.playSound('explosionSmall');
                    }
                } else if ((obj2 === playerShip && obj1 instanceof Spaceship && obj1 !== playerShip)) {
                    if (playerShip && !playerShip.isShieldActive) {
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
            }
        }
    }
}

function addScore(points) {
    score += points;
    console.log(`Score: ${score}`);
}

// --- INPUT HANDLING ---
document.addEventListener('keydown', (e) => {
    if (currentGameState === GameState.SHIP_SELECTION) {
        if (e.code === 'ArrowUp') {
            currentShipSelectionIndex = (currentShipSelectionIndex - 1 + selectablePlayerShips.length) % selectablePlayerShips.length;
            if (selectablePlayerShips.length > 0) selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
        } else if (e.code === 'ArrowDown') {
            currentShipSelectionIndex = (currentShipSelectionIndex + 1) % selectablePlayerShips.length;
            if (selectablePlayerShips.length > 0) selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
        } else if (e.code === 'Enter') {
            if (selectablePlayerShips.length > 0) {
                selectedPlayerSpriteName = selectablePlayerShips[currentShipSelectionIndex].name;
                console.log(`Player selected ship: ${selectedPlayerSpriteName}`);
                currentGameState = GameState.TITLE_SCREEN;
            }
        }
        return;
    }
    else if (currentGameState === GameState.TITLE_SCREEN) {
        if (e.code === 'Space') {
            currentGameState = GameState.PLAYING;
            resetGame(); 
            audioManager.playMusic('background');
            console.log("Game Started from Title Screen");
        }
        return;
    }
    else if (currentGameState === GameState.PLAYER_DIED_CHOICE) {
        if (e.code === 'KeyR') { 
            respawnPlayer();
            currentGameState = GameState.PLAYING;
            audioManager.resumeMusic('background');
            lastTime = performance.now(); 
            console.log("Player chose to respawn.");
        } else if (e.code === 'KeyE') { 
            currentGameState = GameState.GAME_OVER;
            audioManager.stopMusic('background'); 
            audioManager.playSound('gameOver'); 
            console.log("Game Ended by player choice from PLAYER_DIED_CHOICE screen.");
        }
        return;
    }

    if (currentGameState === GameState.GAME_OVER) {
        if (e.code === 'KeyR') {
            initializeShipSelection(); 
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
            lastTime = performance.now(); 
            console.log("Game Resumed");
        }
        return;
    }

    if (e.code === 'KeyM') { 
        audioManager.toggleMute();
    }

    if (currentGameState !== GameState.PLAYING) return;
    if (!playerShip || !playerShip.isActive) return;

    switch (e.code) {
        case 'ArrowUp':
            if (playerShip) playerShip.isThrusting = true;
            break;
        case 'ArrowLeft':
            if(playerShip) playerShip.rotationSpeed = -(playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'ArrowRight':
            if(playerShip) playerShip.rotationSpeed = (playerShip.spriteData.rotationSpeed || Math.PI);
            break;
        case 'Space':
            if(playerShip) {
                const projectileType = playerShip.shoot(); 
                if (projectileType === 'laser') {
                    audioManager.playSound('playerShootLaser');
                } else if (projectileType === 'plasma') {
                    audioManager.playSound('playerShootPlasma');
                } else if (projectileType) { 
                    audioManager.playSound('playerShootLaser'); 
                }
            }
            break;
        case 'Digit1': 
            if (playerShip) playerShip.equipWeapon('laser'); 
            break;
        case 'Digit2': 
            if (playerShip) playerShip.equipWeapon('plasma'); 
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
            if (playerShip) playerShip.rotationSpeed = 0;
            break;
    }
});

requestAnimationFrame(gameLoop);

function respawnPlayer() {
    if (!playerShip) {
        console.error("Cannot respawn: playerShip is null or undefined!");
        currentGameState = GameState.GAME_OVER; 
        return;
    }
    if (!playerShip.spriteData || typeof playerShip.spriteData.name === 'undefined') {
        console.error("Cannot respawn: playerShip.spriteData or playerShip.spriteData.name is missing!");
        playerShip.x = canvas.width / actualZoomLevel / 2; 
        playerShip.y = canvas.height / actualZoomLevel / 2;
        playerShip.health = 100; 
        playerShip.momentumX = 0;
        playerShip.momentumY = 0;
        playerShip.angle = 0;
        playerShip.isActive = true;
        playerShip.activateShield(3);
        audioManager.playSound('playerRespawn');
        audioManager.playSound('shieldActivate');
        console.warn("Player respawned with default values due to missing spriteData.name.");
        return;
    }

    audioManager.playSound('playerRespawn');
    const playerSpriteDefToRespawn = spriteDefinitions.sprites.find(s => s.name === playerShip.spriteData.name);

    if (playerSpriteDefToRespawn) {
        playerShip.x = playerSpriteDefToRespawn.startx || canvas.width / actualZoomLevel / 2;
        playerShip.y = playerSpriteDefToRespawn.starty || canvas.height / actualZoomLevel / 2;
        playerShip.health = playerSpriteDefToRespawn.health || 100;
        playerShip.momentumX = 0;
        playerShip.momentumY = 0;
        playerShip.angle = 0;
        playerShip.isActive = true;
        playerShip.activateShield(3); 
        audioManager.playSound('shieldActivate');
        console.log("Player respawned using sprite definition:", playerSpriteDefToRespawn.name);
    } else {
        console.error("Could not find player sprite definition for respawn:", playerShip.spriteData.name, ". Respawning with defaults.");
        playerShip.x = canvas.width / actualZoomLevel / 2;
        playerShip.y = canvas.height / actualZoomLevel / 2;
        playerShip.health = 100; 
        playerShip.isActive = true;
        playerShip.activateShield(3);
        console.warn("Player respawned with default values as specific definition was not found.");
    }
    if (!gameObjects.includes(playerShip)) {
        console.warn("Player ship was not in gameObjects during respawn. Adding it back.");
        gameObjects.push(playerShip);
    }
}

function resetGame() {
    console.log("Resetting game...");
    score = 0;
    lives = 3;
    gameObjects = []; 

    const finalSelectedPlayerSpriteName = selectedPlayerSpriteName || (selectablePlayerShips.length > 0 ? selectablePlayerShips[0].name : null);

    if (!finalSelectedPlayerSpriteName) {
        console.error("CRITICAL: No player ship selected or available for resetGame!");
        const anyPlayerShipDef = spriteDefinitions.sprites.find(s => s.type === 'ship' && !s.ai);
        if (anyPlayerShipDef) {
            playerShip = new Spaceship(anyPlayerShipDef, canvas, ctx);
        } else {
            if (spriteDefinitions.sprites.length > 0 && spriteDefinitions.sprites[0].type === 'ship') {
                playerShip = new Spaceship(spriteDefinitions.sprites[0], canvas, ctx);
                 console.warn("CRITICAL FALLBACK: Used absolute first ship for player.");
            } else {
                alert("Error: Could not initialize player ship. Game cannot start.");
                currentGameState = GameState.GAME_OVER; 
                return;
            }
        }
    } else {
        const playerSpriteDef = spriteDefinitions.sprites.find(s => s.name === finalSelectedPlayerSpriteName);
        if (playerSpriteDef) {
            playerShip = new Spaceship(playerSpriteDef, canvas, ctx);
        } else {
            console.error(`Failed to find selected player sprite definition "${finalSelectedPlayerSpriteName}" for reset! Defaulting...`);
            if (selectablePlayerShips.length > 0) {
                playerShip = new Spaceship(selectablePlayerShips[0], canvas, ctx);
            } else { // Absolute last resort if selectablePlayerShips is also empty
                 const anyPlayerShipDef = spriteDefinitions.sprites.find(s => s.type === 'ship' && !s.ai) || spriteDefinitions.sprites.find(s => s.type === 'ship');
                 if(anyPlayerShipDef) playerShip = new Spaceship(anyPlayerShipDef, canvas, ctx);
                 else {
                    alert("CRITICAL Error: No player ships defined. Game cannot start.");
                    currentGameState = GameState.GAME_OVER; 
                    return;
                 }
            }
        }
    }

    gameObjects.push(playerShip);
    console.log("Player ship initialized in resetGame:", playerShip.spriteData.name);

    const enemySpritePool = spriteDefinitions.sprites.filter(s => s.type === 'ship' && s.ai);
    enemyShip = null; // Reset general enemyShip reference
    enemySpritePool.forEach((enemySprite, i) => { 
        const newEnemyShip = new Spaceship(enemySprite, canvas, ctx);
        if (playerShip) newEnemyShip.target = playerShip;
        gameObjects.push(newEnemyShip);
        if (i === 0) { 
            enemyShip = newEnemyShip; // Set to the first spawned AI ship
        }
    });

    if (baseAsteroidSpriteData) { 
        for (let i = 0; i < 5; i++) { 
            const individualAsteroidData = {
                ...baseAsteroidSpriteData,
                startx: Math.random() * (canvas.width / actualZoomLevel) * 0.8 + (canvas.width / actualZoomLevel * 0.1),
                starty: Math.random() * (canvas.height / actualZoomLevel) * 0.8 + (canvas.height / actualZoomLevel * 0.1)
            };
            gameObjects.push(new Asteroid(individualAsteroidData, canvas, ctx));
        }
    }
    
    currentWave = 0; 
    initializeLevel(currentWave); 
    lastTime = performance.now(); 
    viewChanged = true; 
    console.log("Game reset complete. Initial gameObjects:", gameObjects.length);
}