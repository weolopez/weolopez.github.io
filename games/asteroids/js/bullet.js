import { Projectile } from "./Projectile.js";

// Renaming to LaserProjectile, assuming this file will now represent that.
// Or, create a new file LaserProjectile.js and import Projectile there.
// For this step, we'll modify bullet.js to become LaserProjectile.js

export class LaserProjectile extends Projectile {
    constructor(owner, initialX, initialY, angle, canvas, ctx) {
        // Define spriteData for a laser, or pass null if not using specific sprite images for it
        const laserSpriteData = {
            width: 4, // Laser width
            height: 10, // Laser length (or use a line drawing approach)
            // No src needed if drawing programmatically
        };
        
        const damage = 10; // Specific damage for laser
        const speed = 700; // pixels per second for laser

        super(laserSpriteData, canvas, ctx, owner, damage, initialX, initialY, angle, speed);
        
        // Laser-specific properties, if any (e.g., color)
        this.color = 'white';
    }

    // Override draw for specific laser appearance
    draw() {
        if (!this.isActive) return;

        this.ctx.save();
        this.ctx.translate(this.x, this.y);
        this.ctx.rotate(this.angle); // Rotate to the projectile's angle

        // Draw a simple rectangle or line for the laser
        this.ctx.fillStyle = this.color;
        // Adjust drawing relative to the new (0,0) which is this.x, this.y
        // Draw it centered on its local y-axis if it's a line
        this.ctx.fillRect(-this.spriteData.height / 2, -this.spriteData.width / 2, this.spriteData.height, this.spriteData.width);
        
        // Example of drawing as a line:
        // this.ctx.beginPath();
        // this.ctx.moveTo(0, 0);
        // this.ctx.lineTo(this.spriteData.height, 0); // Length of laser
        // this.ctx.strokeStyle = this.color;
        // this.ctx.lineWidth = this.spriteData.width;
        // this.ctx.stroke();

        this.ctx.restore();
    }

    // The isInBounds and onHit methods can be inherited from Projectile
    // unless specific behavior is needed for LaserProjectile.
}

// To maintain backward compatibility if 'Bullet' is still imported elsewhere,
// you could temporarily export LaserProjectile as Bullet too, but it's better to update imports.
// export { LaserProjectile as Bullet };
