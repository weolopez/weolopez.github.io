import { Spaceship } from './spaceship.js';
import { Asteroid } from './asteroid.js';
import { LaserProjectile } from './bullet.js'; // Assuming this is where LaserProjectile is
import { PlasmaProjectile } from './PlasmaProjectile.js';
import { ShieldInvulnerabilityPowerUp } from './ShieldInvulnerabilityPowerUp.js';
import { WeaponUpgradePowerUp } from './WeaponUpgradePowerUp.js';
import { SpeedBoostPowerUp } from './SpeedBoostPowerUp.js';
// PowerUp base class might also be needed if generic power-ups are spawned by type string
import { PowerUp } from './PowerUp.js';


export class EntityManager {
    constructor(spriteDefinitions, canvas, ctx) {
        this.spriteDefinitions = spriteDefinitions; // Instance of Sprites class
        this.canvas = canvas;
        this.ctx = ctx;
        this.gameObjects = [];
        this.playerShip = null;
    }

    updateAll(deltaTime, zoomLevel) {
        for (let i = this.gameObjects.length - 1; i >= 0; i--) {
            const obj = this.gameObjects[i];
            if (obj.isActive) {
                obj.update(deltaTime, zoomLevel);
            } else {
                // Remove inactive objects
                this.gameObjects.splice(i, 1);
            }
        }
    }

    getEntities() {
        return this.gameObjects;
    }

    getCollidableEntities() {
        // Could add filtering here if some objects are non-collidable but still in gameObjects
        return this.gameObjects.filter(obj => obj.isActive);
    }

    getPlayerShip() {
        return this.playerShip;
    }

    setPlayerShip(ship) {
        this.playerShip = ship;
        if (ship && !this.gameObjects.includes(ship)) {
            this.addEntity(ship);
        }
    }
    
    addEntity(entity) {
        if (entity && !this.gameObjects.includes(entity)) {
            this.gameObjects.push(entity);
        }
    }

    removeEntity(entity) {
        // Instead of direct removal, mark as inactive. updateAll will clean up.
        if (entity) {
            entity.destroy(); // Sets isActive = false
        }
    }
    
    spawnPlayer(selectedShipName) {
        const playerSpriteDef = this.spriteDefinitions.sprites.find(s => s.name === selectedShipName && s.type === 'ship' && !s.ai);
        if (playerSpriteDef) {
            const newPlayerShip = new Spaceship(playerSpriteDef, this.canvas, this.ctx);
            this.setPlayerShip(newPlayerShip); // This will also add it to gameObjects
            return newPlayerShip;
        } else {
            console.error(`EntityManager: Could not find player sprite definition for name: ${selectedShipName}`);
            // Fallback to first available player ship
            const fallbackPlayerDef = this.spriteDefinitions.sprites.find(s => s.type === 'ship' && !s.ai);
            if (fallbackPlayerDef) {
                console.warn(`EntityManager: Defaulting to player ship: ${fallbackPlayerDef.name}`);
                const newPlayerShip = new Spaceship(fallbackPlayerDef, this.canvas, this.ctx);
                this.setPlayerShip(newPlayerShip);
                return newPlayerShip;
            }
        }
        console.error("EntityManager: CRITICAL - No suitable player ship definition found to spawn.");
        return null;
    }

    spawnEnemy(enemySpriteName, targetPlayerShip) {
        const enemySpriteDef = this.spriteDefinitions.sprites.find(s => s.name === enemySpriteName && s.type === 'ship' && s.ai);
        if (enemySpriteDef) {
            const newEnemy = new Spaceship(enemySpriteDef, this.canvas, this.ctx);
            if (targetPlayerShip) {
                newEnemy.target = targetPlayerShip;
            }
            // Position can be randomized here or by the caller (e.g., GameManager.initializeLevel)
            this.addEntity(newEnemy);
            return newEnemy;
        }
        console.error(`EntityManager: Could not find enemy sprite definition for name: ${enemySpriteName}`);
        return null;
    }

    spawnAsteroid(asteroidTypeName, x, y) {
        const asteroidSpriteDef = this.spriteDefinitions.sprites.find(s => s.type === asteroidTypeName || s.name === asteroidTypeName);
        if (asteroidSpriteDef) {
            const newAsteroidData = { ...asteroidSpriteDef };
            if (x !== undefined) newAsteroidData.startx = x;
            if (y !== undefined) newAsteroidData.starty = y;
            
            const newAsteroid = new Asteroid(newAsteroidData, this.canvas, this.ctx);
            this.addEntity(newAsteroid);
            return newAsteroid;
        }
        console.error(`EntityManager: Could not find asteroid sprite definition for type/name: ${asteroidTypeName}`);
        return null;
    }
    
    spawnProjectile(projectile) { // Projectiles are now created by weapons and passed here
        if (projectile) {
            this.addEntity(projectile);
        }
    }

    spawnPowerUp(powerUpType, x, y, spriteDataDefaults = {}) {
        // Sprite data for power-ups can be minimal or defined in sprites.js if complex
        const baseSpriteData = { 
            startx: x, 
            starty: y, 
            width: 20, 
            height: 20, 
            ...spriteDataDefaults 
        };

        let powerUp = null;
        switch (powerUpType) {
            case 'shield_invulnerability':
                baseSpriteData.color = baseSpriteData.color || 'rgba(0, 150, 255, 0.8)';
                powerUp = new ShieldInvulnerabilityPowerUp(baseSpriteData, this.canvas, this.ctx);
                break;
            case 'weapon_upgrade':
                 baseSpriteData.color = baseSpriteData.color || 'rgba(255, 165, 0, 0.8)';
                powerUp = new WeaponUpgradePowerUp(baseSpriteData, this.canvas, this.ctx);
                break;
            case 'speed_boost':
                 baseSpriteData.color = baseSpriteData.color || 'rgba(0, 255, 0, 0.8)';
                powerUp = new SpeedBoostPowerUp(baseSpriteData, this.canvas, this.ctx);
                break;
            default:
                console.warn(`EntityManager: Unknown power-up type "${powerUpType}". Cannot spawn.`);
                return null;
        }
        if (powerUp) {
            this.addEntity(powerUp);
        }
        return powerUp;
    }

    spawnWaveEntities(waveNumber, playerShipRef, worldWidth, worldHeight, currentZoom) {
        // Note: worldWidth and worldHeight are already adjusted for zoom by GameManager

        // Spawn Asteroids
        const numAsteroids = 3 + waveNumber * 2;
        const baseAsteroidData = this.spriteDefinitions.sprites.find(s => s.type === 'asteroid_large');
        if (baseAsteroidData) {
            for (let i = 0; i < numAsteroids; i++) {
                const individualAsteroidData = {
                    ...baseAsteroidData,
                    startx: Math.random() * (worldWidth * 0.8) + (worldWidth * 0.1),
                    starty: Math.random() * (worldHeight * 0.8) + (worldHeight * 0.1),
                };
                this.spawnAsteroid(individualAsteroidData.type, individualAsteroidData.startx, individualAsteroidData.starty);
            }
        } else {
            console.error("EntityManager: Base large asteroid data not found for wave spawn.");
        }

        // Spawn Enemies
        const enemySpritePool = this.spriteDefinitions.sprites.filter(s => s.type === 'ship' && s.ai);
        const numEnemiesToSpawn = 1 + Math.floor(waveNumber / 2);

        for (let i = 0; i < numEnemiesToSpawn; i++) {
            if (enemySpritePool.length > 0) {
                const enemySprite = enemySpritePool[i % enemySpritePool.length];
                const newEnemy = this.spawnEnemy(enemySprite.name, playerShipRef);
                if (newEnemy) {
                    newEnemy.x = Math.random() * worldWidth;
                    newEnemy.y = Math.random() * worldHeight * 0.3; // Spawn towards top
                }
            }
        }
        console.log(`EntityManager: Spawned entities for Wave ${waveNumber}. Total gameObjects: ${this.gameObjects.length}`);
    }

    clearAllExceptPlayer() {
        if (this.playerShip) {
            // Ensure playerShip itself is not duplicated if it was re-added
            this.gameObjects = [this.playerShip];
        } else {
            this.gameObjects = [];
        }
    }

    clearAll() {
        this.gameObjects = [];
        this.playerShip = null;
    }

    // Helper for respawning player, used by GameManager
    respawnPlayer(playerShipInstance, currentZoom) {
        if (!playerShipInstance || !playerShipInstance.spriteData) {
            console.error("EntityManager.respawnPlayer: Invalid playerShipInstance or missing spriteData.");
            return;
        }
        const playerSpriteDefToRespawn = this.spriteDefinitions.sprites.find(s => s.name === playerShipInstance.spriteData.name);

        if (playerSpriteDefToRespawn) {
            playerShipInstance.x = playerSpriteDefToRespawn.startx || (this.canvas.width / currentZoom / 2);
            playerShipInstance.y = playerSpriteDefToRespawn.starty || (this.canvas.height / currentZoom / 2);
            playerShipInstance.health = playerSpriteDefToRespawn.health || 100;
            playerShipInstance.momentumX = 0;
            playerShipInstance.momentumY = 0;
            playerShipInstance.angle = 0;
            playerShipInstance.isActive = true;
            playerShipInstance.activateShield(3); // Brief invulnerability
            // Sound for respawn/shield is handled by GameManager/AudioManager
        } else {
            console.error("EntityManager.respawnPlayer: Could not find player sprite definition for respawn:", playerShipInstance.spriteData.name);
            // Fallback to generic state
            playerShipInstance.x = (this.canvas.width / currentZoom / 2);
            playerShipInstance.y = (this.canvas.height / currentZoom / 2);
            playerShipInstance.health = 100;
            playerShipInstance.isActive = true;
            playerShipInstance.activateShield(3);
        }
        if (!this.gameObjects.includes(playerShipInstance)) {
            this.addEntity(playerShipInstance); // Ensure it's in the list if it was somehow removed
        }
    }
}