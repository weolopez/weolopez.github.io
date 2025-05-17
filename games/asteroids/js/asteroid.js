import { GameObject } from "./GameObject.js";
import { ShieldInvulnerabilityPowerUp } from "./ShieldInvulnerabilityPowerUp.js";
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
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // Style based on spriteData if available, otherwise default
        this.ctx.fillStyle = this.spriteData.color || 'grey'; 
        this.ctx.fill();
        this.ctx.strokeStyle = this.spriteData.borderColor || 'white';
        this.ctx.lineWidth = this.spriteData.lineWidth || 1;
        this.ctx.stroke();
        this.ctx.restore();
    }

    takeDamage(amount) {
        if (!this.isActive) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.onDestruction();
            this.destroy(); // Mark for removal
        }
    }

    onDestruction() {
        // Placeholder for logic when asteroid is destroyed
        // e.g., spawn smaller asteroids, drop power-ups, add score
        console.log(`Asteroid destroyed at (${this.x.toFixed(2)}, ${this.y.toFixed(2)}). Points: ${this.points}`);
        
        // Chance to spawn a shield power-up
        const powerUpChance = 0.25; // 25% chance
        if (Math.random() < powerUpChance) {
            console.log("Spawning Shield PowerUp!");
            // SpriteData for the power-up can be minimal if ShieldInvulnerabilityPowerUp has good defaults
            const powerUpSpriteData = {
                // width: 20, height: 20, color: 'blue' // Example if needed
            };
            return new ShieldInvulnerabilityPowerUp(
                powerUpSpriteData,
                this.canvas,
                this.ctx,
                this.x,
                this.y
            );
        }
        return null; // No power-up spawned
    }
}
