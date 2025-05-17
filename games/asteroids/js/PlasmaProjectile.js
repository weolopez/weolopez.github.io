import { Projectile } from "./Projectile.js";

export class PlasmaProjectile extends Projectile {
    constructor(owner, initialX, initialY, angle, canvas, ctx) {
        const plasmaSpriteData = {
            width: 10, // Plasma bolt width
            height: 10, // Plasma bolt height
            // No src needed if drawing programmatically
        };
        
        const damage = 35; // Higher damage for plasma
        const speed = 400; // Slower speed for plasma

        super(plasmaSpriteData, canvas, ctx, owner, damage, initialX, initialY, angle, speed);
        
        this.color = 'rgba(0, 255, 100, 0.8)'; // Greenish plasma color
        this.trail = [];
        this.trailMaxLength = 10;
    }

    update(deltaTime) {
        super.update(deltaTime); // Call base projectile update for movement

        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailMaxLength) {
            this.trail.shift(); // Remove oldest point
        }
    }

    draw() {
        if (!this.isActive) return;

        this.ctx.save();

        // Draw trail
        if (this.trail.length > 1) {
            for (let i = 0; i < this.trail.length - 1; i++) {
                const startPoint = this.trail[i];
                const endPoint = this.trail[i+1];
                const opacity = ((i + 1) / this.trailMaxLength) * 0.4 + 0.1; // Fade out trail, ensure minimum opacity
                
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                
                this.ctx.strokeStyle = `rgba(0, 255, 100, ${opacity})`;
                // Gradually decrease line width for the trail
                this.ctx.lineWidth = this.spriteData.width * (opacity * 0.8);
                this.ctx.stroke();
            }
        }
        
        // Draw main plasma ball
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.spriteData.width / 2, 0, Math.PI * 2);
        this.ctx.fillStyle = this.color;
        this.ctx.fill();
        
        // Outer glow
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.spriteData.width / 2 + 3, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(100, 255, 150, 0.3)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.restore();
    }
}