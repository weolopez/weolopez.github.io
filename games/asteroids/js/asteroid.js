import { GameObject } from "./GameObject.js";
import { ShieldInvulnerabilityPowerUp } from "./ShieldInvulnerabilityPowerUp.js";
import { WeaponUpgradePowerUp } from "./WeaponUpgradePowerUp.js";
import { SpeedBoostPowerUp } from "./SpeedBoostPowerUp.js";
// We need access to the main gameObjects array or a spawn function to add the power-up to the game.
// For now, onDestruction will return the power-up if created, and main.js will handle adding it.

export class Asteroid extends GameObject {
    constructor(spriteData, canvas, ctx) {
        // spriteData for an asteroid might include:
        // startx, starty, width, height (for bounding box, if not using size for radius directly)
        // size (radius for drawing and collision),
        // speed (base speed),
        // health,
        // points (score value)
        // type (e.g., 'large', 'medium', 'small' for different behaviors/sprites)
        super(spriteData, canvas, ctx);

        this.size = this.spriteData.size || 30; // Default size if not in spriteData
        // Set width and height for AABB collision detection in GameObject
        this.width = this.size * 2;
        this.height = this.size * 2;
        // Adjust x and y from GameObject if they are top-left for AABB, but asteroid logic uses center
        // For now, GameObject's x,y are top-left. Asteroid's drawing uses x,y as center for arc.
        // This means collision x,y will be top-left, but drawing x,y is center. This needs to be consistent.
        // Let's assume GameObject x,y is center for now, and adjust AABB check if needed, or drawing.
        // For simplicity, let's assume x,y from super() is the center for Asteroid.
        // The AABB check in GameObject needs to be aware of this (e.g. x - width/2).
        // Or, Asteroid overrides checkCollisionWith for circle-based.

        this.angle = Math.random() * Math.PI * 2; // Initial random direction
        
        // Use momentum for movement, set initial momentum based on random angle and speed
        const initialSpeed = this.spriteData.speed || (Math.random() * 1.5 + 0.5); // pixels per second
        this.momentumX = Math.cos(this.angle) * initialSpeed;
        this.momentumY = Math.sin(this.angle) * initialSpeed;
        
        this.health = this.spriteData.health || 50; // Default health
        this.points = this.spriteData.points || 10; // Score points for destroying
    }

    update(deltaTime, zoomLevel) { // Added zoomLevel for context, though asteroids might not use it directly
        if (!this.isActive) return;

        super.update(deltaTime); // Call GameObject's update if it has any base logic

        // Update position based on momentum
        this.x += this.momentumX * deltaTime;
        this.y += this.momentumY * deltaTime;

        // Screen wrapping (relative to the current view, considering zoom)
        const worldWidth = this.canvas.width / zoomLevel;
        const worldHeight = this.canvas.height / zoomLevel;

        if (this.x + this.size < 0) this.x = worldWidth + this.size;
        if (this.x - this.size > worldWidth) this.x = -this.size;
        if (this.y + this.size < 0) this.y = worldHeight + this.size;
        if (this.y - this.size > worldHeight) this.y = -this.size;
    }

    draw() {
        if (!this.isActive) return;

        this.ctx.save();
        // Translate to center for rotation if asteroids were to rotate visually (not currently implemented for asteroids)
        // this.ctx.translate(this.x, this.y);
        // this.ctx.rotate(this.angle); // Asteroids don't visually rotate based on their movement angle currently
        // this.ctx.translate(-this.width / 2, -this.height / 2);

        if (this.image && this.image.complete && this.image.naturalWidth !== 0) {
            // Draw using spritesheet data if available
            // Assuming this.x, this.y is the center, adjust draw position to top-left for drawImage
            this.ctx.drawImage(
                this.image,
                this.spriteData.sx || 0,
                this.spriteData.sy || 0,
                this.spriteData.sWidth || this.spriteData.width, // Use spriteData.width/height for source, if sWidth/sHeight not given
                this.spriteData.sHeight || this.spriteData.height,
                this.x - this.width / 2, // Draw at x,y as center
                this.y - this.height / 2,
                this.width,  // Destination width
                this.height  // Destination height
            );
        } else {
            // Fallback drawing: a simple colored circle
            this.ctx.beginPath();
            // For arc, x and y are already center.
            this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            this.ctx.fillStyle = this.spriteData.color || 'grey';
            this.ctx.fill();
            if (this.spriteData.borderColor) {
                this.ctx.strokeStyle = this.spriteData.borderColor;
                this.ctx.lineWidth = this.spriteData.lineWidth || 1;
                this.ctx.stroke();
            }
        }
        this.ctx.restore();
    }

    takeDamage(amount, spriteDefinitions) { // Added spriteDefinitions parameter
        if (!this.isActive) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            // onDestruction now returns new objects, but takeDamage doesn't need to handle them directly.
            // The caller (handleCollisions in main.js) will call onDestruction separately
            // after confirming the asteroid is indeed destroyed by takeDamage.
            // So, we don't call this.onDestruction() from here anymore.
            // We just ensure this.destroy() is called.
            this.destroy(); // Mark for removal
        }
    }

    onDestruction(spriteDefinitions) { // Pass spriteDefinitions to find new asteroid types
        console.log(`Asteroid.onDestruction called for ${this.spriteData.name}. Received spriteDefinitions:`, JSON.parse(JSON.stringify(spriteDefinitions || null))); // DEBUG

        if (!spriteDefinitions || !Array.isArray(spriteDefinitions.sprites)) {
            console.error("Asteroid.onDestruction: spriteDefinitions or spriteDefinitions.sprites is invalid or not an array!", spriteDefinitions);
            return []; // Return empty array if definitions are missing or malformed
        }

        const newObjects = [];

        // Asteroid breakup logic
        if (this.spriteData.breakInto) {
            const breakIntoData = this.spriteData.breakInto;
            // Ensure spriteDefinitions.sprites is an array before calling find
            const newAsteroidSpriteData = spriteDefinitions.sprites.find(s => s.type === breakIntoData.type || s.name === breakIntoData.type);

            if (newAsteroidSpriteData) {
                for (let i = 0; i < breakIntoData.count; i++) {
                    // Create a new spriteData instance for the new asteroid to avoid shared references,
                    // and set its starting position.
                    const individualSpriteData = {
                        ...newAsteroidSpriteData,
                        startx: this.x + (Math.random() - 0.5) * this.size * 0.5, // Spawn nearby
                        starty: this.y + (Math.random() - 0.5) * this.size * 0.5
                    };
                    const newAsteroid = new Asteroid(individualSpriteData, this.canvas, this.ctx);
                    // Give new asteroids slightly varied velocities
                    const angleOffset = (Math.random() - 0.5) * Math.PI / 2; // +/- 45 degrees from original
                    const speedMultiplier = 1 + (Math.random() - 0.5) * 0.4; // +/- 20% speed variation
                    newAsteroid.momentumX = Math.cos(this.angle + angleOffset) * (this.spriteData.speed || 50) * speedMultiplier * 0.75; // Inherit some momentum
                    newAsteroid.momentumY = Math.sin(this.angle + angleOffset) * (this.spriteData.speed || 50) * speedMultiplier * 0.75;
                    newObjects.push(newAsteroid);
                    console.log(`Spawned ${newAsteroidSpriteData.name}`);
                }
            } else {
                console.warn(`Could not find sprite data for asteroid type: ${breakIntoData.type}`);
            }
        }

        // Chance to spawn a power-up
        const randomValue = Math.random();
        const shieldPowerUpChance = 0.10;
        const weaponUpgradePowerUpChance = 0.10;
        const speedBoostPowerUpChance = 0.10;
        let powerUpToSpawn = null;

        if (randomValue < shieldPowerUpChance) {
            console.log("Spawning Shield PowerUp!");
            powerUpToSpawn = new ShieldInvulnerabilityPowerUp(
                { startx: this.x, starty: this.y, width: 20, height: 20, color: 'rgba(0, 150, 255, 0.8)' },
                this.canvas, this.ctx
            );
        } else if (randomValue < shieldPowerUpChance + weaponUpgradePowerUpChance) {
            console.log("Spawning Weapon Upgrade PowerUp!");
            powerUpToSpawn = new WeaponUpgradePowerUp(
                { startx: this.x, starty: this.y, width: 20, height: 20, color: 'rgba(255, 165, 0, 0.8)' },
                this.canvas, this.ctx
            );
        } else if (randomValue < shieldPowerUpChance + weaponUpgradePowerUpChance + speedBoostPowerUpChance) {
            console.log("Spawning Speed Boost PowerUp!");
            powerUpToSpawn = new SpeedBoostPowerUp(
                { startx: this.x, starty: this.y, width: 20, height: 20, color: 'rgba(0, 255, 0, 0.8)' },
                this.canvas, this.ctx
            );
        }

        if (powerUpToSpawn) {
            newObjects.push(powerUpToSpawn);
        }

        return newObjects; // Returns an array of new game objects (asteroids and/or a power-up)
    }
}
