import { Spaceship } from './spaceship.js';
import { Asteroid } from './asteroid.js';
import { LaserProjectile } from './bullet.js';
import { PlasmaProjectile } from './PlasmaProjectile.js';
import { PowerUp } from './PowerUp.js';
// Import specific power-up types if needed for instanceof checks, though onCollected is preferred
// import { ShieldInvulnerabilityPowerUp } from './ShieldInvulnerabilityPowerUp.js';

export class CollisionSystem {
    constructor(entityManager, gameManager, audioManager, spriteDefinitions) {
        this.entityManager = entityManager;
        this.gameManager = gameManager; // To call addScore, etc.
        this.audioManager = audioManager;
        this.spriteDefinitions = spriteDefinitions; // For onDestruction logic
    }

    checkAndResolveCollisions() {
        const entities = this.entityManager.getCollidableEntities();
        const playerShip = this.entityManager.getPlayerShip();

        for (let i = 0; i < entities.length; i++) {
            for (let j = i + 1; j < entities.length; j++) {
                const obj1 = entities[i];
                const obj2 = entities[j];

                // Ensure objects are still active as collisions can deactivate them
                if (!obj1.isActive || !obj2.isActive) continue;

                if (obj1.checkCollisionWith(obj2)) {
                    // --- Player Projectile Collisions ---
                    if (this.isPlayerProjectile(obj1) && obj2 instanceof Asteroid) {
                        this.handlePlayerProjectileVsAsteroid(obj1, obj2);
                    } else if (this.isPlayerProjectile(obj2) && obj1 instanceof Asteroid) {
                        this.handlePlayerProjectileVsAsteroid(obj2, obj1);
                    } else if (this.isPlayerProjectile(obj1) && obj2 instanceof Spaceship && obj2 !== playerShip) {
                        this.handlePlayerProjectileVsEnemy(obj1, obj2);
                    } else if (this.isPlayerProjectile(obj2) && obj1 instanceof Spaceship && obj1 !== playerShip) {
                        this.handlePlayerProjectileVsEnemy(obj2, obj1);
                    }
                    // --- Player Ship Collisions ---
                    else if (obj1 === playerShip && obj2 instanceof Asteroid) {
                        this.handlePlayerVsAsteroid(obj1, obj2);
                    } else if (obj2 === playerShip && obj1 instanceof Asteroid) {
                        this.handlePlayerVsAsteroid(obj2, obj1);
                    } else if (obj1 === playerShip && obj2 instanceof Spaceship && obj2 !== playerShip) {
                        this.handlePlayerVsEnemy(obj1, obj2);
                    } else if (obj2 === playerShip && obj1 instanceof Spaceship && obj1 !== playerShip) {
                        this.handlePlayerVsEnemy(obj2, obj1);
                    } else if (obj1 === playerShip && obj2 instanceof PowerUp) {
                        this.handlePlayerVsPowerUp(obj1, obj2);
                    } else if (obj2 === playerShip && obj1 instanceof PowerUp) {
                        this.handlePlayerVsPowerUp(obj2, obj1);
                    }
                    // --- Enemy Projectile Collisions ---
                    else if (this.isEnemyProjectile(obj1) && obj2 === playerShip) {
                        this.handleEnemyProjectileVsPlayer(obj1, obj2);
                    } else if (this.isEnemyProjectile(obj2) && obj1 === playerShip) {
                        this.handleEnemyProjectileVsPlayer(obj2, obj1);
                    }
                    // --- Enemy Ship vs Asteroid ---
                    else if (obj1 instanceof Spaceship && obj1 !== playerShip && obj2 instanceof Asteroid) {
                        this.handleEnemyVsAsteroid(obj1, obj2);
                    } else if (obj2 instanceof Spaceship && obj2 !== playerShip && obj1 instanceof Asteroid) {
                        this.handleEnemyVsAsteroid(obj2, obj1);
                    }
                    // Potentially other collision types like Enemy vs Enemy (if friendly fire is off)
                }
            }
        }
    }

    isPlayerProjectile(obj) {
        return (obj instanceof LaserProjectile || obj instanceof PlasmaProjectile) && obj.owner === this.entityManager.getPlayerShip();
    }

    isEnemyProjectile(obj) {
        return (obj instanceof LaserProjectile || obj instanceof PlasmaProjectile) && obj.owner !== this.entityManager.getPlayerShip() && obj.owner instanceof Spaceship;
    }

    handlePlayerProjectileVsAsteroid(projectile, asteroid) {
        const asteroidWasActive = asteroid.isActive;
        asteroid.takeDamage(projectile.damage);
        this.audioManager.playSound('hitDamage');
        projectile.onHit(asteroid); 

        if (asteroidWasActive && !asteroid.isActive) {
            this.gameManager.addScore(asteroid.spriteData.points || 10);
            this.audioManager.playSound(asteroid.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
            const newObjects = asteroid.onDestruction(this.spriteDefinitions);
            if (newObjects && newObjects.length > 0) {
                newObjects.forEach(obj => this.entityManager.addEntity(obj));
            }
        }
    }

    handlePlayerProjectileVsEnemy(projectile, enemy) {
        const enemyWasActive = enemy.isActive;
        enemy.takeDamage(projectile.damage);
        this.audioManager.playSound('hitDamage');
        projectile.onHit(enemy);

        if (enemyWasActive && !enemy.isActive) {
            this.gameManager.addScore(enemy.spriteData.points || 50);
            this.audioManager.playSound('explosionSmall');
            // Potentially spawn power-up from enemy.onDestruction()
            const newPowerUp = enemy.onDestruction(); // Assuming onDestruction might return a power-up type or null
            if (newPowerUp && typeof newPowerUp === 'string') { // e.g. onDestruction returns 'shield_invulnerability'
                this.entityManager.spawnPowerUp(newPowerUp, enemy.x, enemy.y);
            }
        }
    }

    handlePlayerVsAsteroid(player, asteroid) {
        if (!player.isShieldActive && player.collidesWithAsteroid && player.collidesWithAsteroid(asteroid)) {
            player.takeDamage(20); 
            this.audioManager.playSound('hitDamage');
            const asteroidWasActive = asteroid.isActive;
            asteroid.takeDamage(100); 
            if (asteroidWasActive && !asteroid.isActive) {
                this.audioManager.playSound(asteroid.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
                const newObjects = asteroid.onDestruction(this.spriteDefinitions);
                if (newObjects && newObjects.length > 0) {
                    newObjects.forEach(obj => this.entityManager.addEntity(obj));
                }
            }
        }
    }

    handlePlayerVsEnemy(player, enemy) {
        if (!player.isShieldActive) {
            player.takeDamage(25); 
            this.audioManager.playSound('hitDamage');
        }
        const enemyWasActive = enemy.isActive;
        enemy.takeDamage(25); 
        if (enemyWasActive && !enemy.isActive) {
            this.gameManager.addScore(enemy.spriteData.points || 50); 
            this.audioManager.playSound('explosionSmall');
            const newPowerUp = enemy.onDestruction();
            if (newPowerUp && typeof newPowerUp === 'string') {
                this.entityManager.spawnPowerUp(newPowerUp, enemy.x, enemy.y);
            }
        }
    }
    
    handlePlayerVsPowerUp(player, powerUp) {
        if (powerUp.isActive) { // Ensure power-up hasn't been collected in the same frame by another check
            powerUp.onCollected(player); // This should set powerUp.isActive = false
            this.audioManager.playSound('powerupCollect');
            // EntityManager's updateAll will remove it
        }
    }

    handleEnemyProjectileVsPlayer(projectile, player) {
        if (!player.isShieldActive) {
            player.takeDamage(projectile.damage);
            this.audioManager.playSound('hitDamage');
        }
        projectile.onHit(player); 
    }

    handleEnemyVsAsteroid(enemy, asteroid) {
        const enemyWasActive = enemy.isActive;
        enemy.takeDamage(15); 
        this.audioManager.playSound('hitDamage'); 

        const asteroidWasActive = asteroid.isActive;
        asteroid.takeDamage(50); 

        if (asteroidWasActive && !asteroid.isActive) {
            this.audioManager.playSound(asteroid.spriteData.type === 'asteroid_large' ? 'explosionLarge' : 'explosionSmall');
            const newObjects = asteroid.onDestruction(this.spriteDefinitions);
            if (newObjects && newObjects.length > 0) {
                newObjects.forEach(obj => this.entityManager.addEntity(obj));
            }
        }
        if (enemyWasActive && !enemy.isActive) {
            this.audioManager.playSound('explosionSmall');
            // No score for player if enemy destroys itself
        }
    }
}