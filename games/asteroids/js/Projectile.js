import { GameObject } from "./GameObject.js";

export class Projectile extends GameObject {
    constructor(spriteData, canvas, ctx, owner, damage, initialX, initialY, angle, speed) {
        // If spriteData is not fully provided, we can construct a minimal one.
        const defaultSpriteData = {
            startx: initialX,
            starty: initialY,
            width: spriteData && spriteData.width || 4, // Default width if not in spriteData
            height: spriteData && spriteData.height || 4, // Default height
            src: spriteData && spriteData.src || '', // Optional image source
            // sx, sy, sWidth, sHeight for spritesheets can be part of spriteData
        };
        super(defaultSpriteData, canvas, ctx);

        this.owner = owner; // The entity that fired this projectile
        this.damage = damage || 10; // Default damage
        this.angle = angle;
        
        // Projectiles typically don't have their own "speed" property for thrust,
        // but rather a constant velocity set at creation. We'll use momentum for this.
        const projectileSpeed = speed || 500; // pixels per second
        this.momentumX = Math.cos(this.angle) * projectileSpeed;
        this.momentumY = Math.sin(this.angle) * projectileSpeed;

        // Projectiles usually don't have health or further complex sprite data beyond visuals
    }

    update(deltaTime) {
        if (!this.isActive) return;
        super.update(deltaTime); // Call GameObject's update if it has any base logic

        // Update position based on momentum
        this.x += this.momentumX * deltaTime;
        this.y += this.momentumY * deltaTime;

        // Lifespan or range limit can be added here if needed
        // e.g., this.lifeTimer -= deltaTime; if (this.lifeTimer <= 0) this.destroy();
    }

    // Basic draw method, to be overridden by specific projectile types
    draw() {
        if (!this.isActive) return;
        // A generic projectile might not draw anything, or draw a simple shape
        // this.ctx.fillStyle = 'yellow';
        // this.ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    isInBounds(worldWidth, worldHeight) {
        // Check if the projectile is within the game world boundaries
        return (
            this.x + this.width > 0 &&
            this.x - this.width < worldWidth && // Adjusted for projectile size
            this.y + this.height > 0 &&
            this.y - this.height < worldHeight // Adjusted for projectile size
        );
    }

    // Collision detection will primarily be handled by a central system
    // using GameObject's checkCollisionWith or more specific checks.
    // Individual projectiles might have an onHit(target) method if needed.
    onHit(target) {
        // console.log("Projectile hit:", target);
        this.destroy(); // Projectile is usually destroyed on hit
    }
}