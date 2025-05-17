import { GameObject } from "./GameObject.js";

export class PowerUp extends GameObject {
    constructor(spriteData, canvas, ctx, type, duration = 0) {
        // spriteData for a PowerUp might include:
        // startx, starty, width, height, src (for image), sx, sy, sWidth, sHeight (for spritesheet)
        // color (if drawing programmatically)
        super(spriteData, canvas, ctx);

        this.type = type; // e.g., 'shield_invulnerability', 'weapon_upgrade', 'health_pack'
        this.duration = duration; // Duration of the effect in seconds (if applicable)
        
        // Power-ups might have a slight bobbing or spinning animation
        this.animationTimer = 0;
        this.initialY = this.y; // For bobbing effect
    }

    update(deltaTime, zoomLevel) {
        if (!this.isActive) return;
        super.update(deltaTime); // Call GameObject's update if it has any base logic

        // Example: simple bobbing animation
        this.animationTimer += deltaTime;
        this.y = this.initialY + Math.sin(this.animationTimer * 2) * 5; // Bob up and down by 5 pixels
    }

    // Basic draw method, can be overridden by specific power-up types
    draw() {
        if (!this.isActive) return;

        this.ctx.save();
        // Example drawing: a simple colored circle or square if no sprite
        if (this.spriteData && this.spriteData.src && this.image && this.image.complete) {
            // Draw using spritesheet data if available
             this.ctx.drawImage(
                this.image,
                this.spriteData.sx || 0,
                this.spriteData.sy || 0,
                this.spriteData.sWidth || this.spriteData.width,
                this.spriteData.sHeight || this.spriteData.height,
                this.x,
                this.y,
                this.spriteData.width,
                this.spriteData.height
            );
        } else {
            // Fallback drawing
            this.ctx.fillStyle = this.spriteData.color || 'purple'; // Default color for power-ups
            this.ctx.beginPath();
            this.ctx.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
            this.ctx.fill();
            // Or draw a rectangle:
            // this.ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        this.ctx.restore();
    }

    // Abstract method to be implemented by specific power-up types
    applyEffect(spaceship) {
        console.warn(`applyEffect not implemented for PowerUp type: ${this.type}`);
    }

    onCollected(spaceship) {
        if (!this.isActive) return;
        console.log(`PowerUp ${this.type} collected by ${spaceship.spriteData.name || 'spaceship'}`);
        this.applyEffect(spaceship);
        this.destroy(); // Mark for removal
    }
}