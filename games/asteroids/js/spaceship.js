import { LaserProjectile } from "./bullet.js"; // Assuming LaserProjectile is in bullet.js
import { GameObject } from "./GameObject.js";
import { LaserWeapon } from "./LaserWeapon.js";
// import { PlasmaWeapon } from "./PlasmaWeapon.js"; // Will be used later

export class Spaceship extends GameObject {
    target; // For AI or player targeting
    aimTowards; // Boolean for AI behavior
    ai; // AI behavior function
    // asteroids; // This will likely be managed by a game manager/entity list
    zoomLevel; // Current zoom level of the game view, passed during update

    constructor(spriteData, canvas, ctx) {
        super(spriteData, canvas, ctx); // Calls GameObject constructor

        // Spaceship-specific properties from spriteData or defaults
        this.scale = spriteData.scale || 1;
        this.max_speed = spriteData.max_speed || 300; // Max magnitude of momentum vector (pixels/sec)
        this.rotationSpeed = 0; // Player controlled, or set by AI (radians per second)
        
        this.shipImage = new Image();
        this.shipImage.src = this.spriteData.src;

        if (this.spriteData.ai) {
            this.ai = this.spriteData.ai;
        }

        // New properties from the enhancement plan
        this.health = this.spriteData.health || 100;
        this.isShieldActive = false;
        this.shieldTimer = 0; // Seconds
        this.bullets = []; // Stores projectiles fired by this ship

        // Equip a default weapon
        this.currentWeapon = new LaserWeapon(this);
        // Later, this could be determined by spriteData.defaultWeapon or similar
    }

    update(deltaTime, zoomLevel) {
        if (!this.isActive) return;

        super.update(deltaTime); // Call GameObject's update if it has any base logic

        this.zoomLevel = zoomLevel; 
        const worldWidth = this.canvas.width / this.zoomLevel;
        const worldHeight = this.canvas.height / this.zoomLevel;

        if (this.ai) {
            this.ai(this, deltaTime); // Pass deltaTime to AI behavior function
        }

        // Cap momentum (velocity) based on max_speed
        const currentSpeedMagnitude = Math.sqrt(this.momentumX ** 2 + this.momentumY ** 2);
        if (this.max_speed && currentSpeedMagnitude > this.max_speed) {
            const scaleFactor = this.max_speed / currentSpeedMagnitude;
            this.momentumX *= scaleFactor;
            this.momentumY *= scaleFactor;
        }

        // Apply rotation
        this.angle += this.rotationSpeed * deltaTime; // rotationSpeed should be radians per second


        // Apply momentum (drift) - position update
        // Note: If momentum is in world units, zoomLevel doesn't affect its application here.
        // If momentum was screen units, it would be:
        // this.x += this.momentumX * this.zoomLevel * deltaTime; 
        // this.y += this.momentumY * this.zoomLevel * deltaTime;
        this.x += this.momentumX * deltaTime;
        this.y += this.momentumY * deltaTime;


        // Screen wrapping
        if (this.x < 0) this.x = worldWidth;
        if (this.x > worldWidth) this.x = 0;
        if (this.y < 0) this.y = worldHeight;
        if (this.y > worldHeight) this.y = 0;

        // Update bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(deltaTime);
            if (!bullet.isInBounds(worldWidth, worldHeight)) { 
                this.bullets.splice(i, 1);
            }
        }
        
        // Shield timer update
        if (this.isShieldActive) {
            this.shieldTimer -= deltaTime;
            if (this.shieldTimer <= 0) {
                this.isShieldActive = false;
                this.shieldTimer = 0;
                // console.log("Shield deactivated");
            }
        }

        // Update current weapon cooldown
        if (this.currentWeapon) {
            this.currentWeapon.update(deltaTime);
        }
    }

    draw() {
        if (!this.isActive) return;

        this.ctx.save();
        // Translate to the center of the sprite for rotation
        this.ctx.translate(this.x + this.spriteData.width / 2, this.y + this.spriteData.height / 2);
        this.ctx.rotate(this.angle + Math.PI / 2); // Common adjustment for top-down sprites
        // Translate back, so drawing happens from the (rotated) top-left corner of the sprite image
        this.ctx.translate(-this.spriteData.width / 2, -this.spriteData.height / 2);

        if (this.shipImage.complete && this.shipImage.naturalWidth !== 0) {
            this.ctx.drawImage(
                this.shipImage,
                this.spriteData.sx || 0,
                this.spriteData.sy || 0,
                this.spriteData.sWidth || this.spriteData.width,
                this.spriteData.sHeight || this.spriteData.height,
                0, 0,
                this.spriteData.width,
                this.spriteData.height
            );
        } else {
            this.ctx.fillStyle = 'grey';
            this.ctx.fillRect(0, 0, this.spriteData.width, this.spriteData.height);
        }
        
        if (this.isShieldActive) {
            this.ctx.beginPath();
            this.ctx.arc(this.spriteData.width / 2, this.spriteData.height / 2, Math.max(this.spriteData.width, this.spriteData.height) * 0.6, 0, Math.PI * 2);
            this.ctx.strokeStyle = 'rgba(0, 150, 255, 0.7)';
            this.ctx.lineWidth = 2 / this.zoomLevel;
            this.ctx.stroke();
        }
        
        this.ctx.restore();

        // Bullets are now part of the global gameObjects list and drawn there.
        // If you want ships to draw their own bullets for some reason, uncomment this:
        // this.bullets.forEach(bullet => bullet.draw());
    }

    shoot() {
        // Calculate bullet starting position from the ship's "nose" or center
        // Adjust offset if sprite's visual center is not its rotational center.
        const noseOffsetX = (this.spriteData.width / 2) * Math.cos(this.angle - Math.PI / 2); // If spriteData.width is forward
        const noseOffsetY = (this.spriteData.height / 2) * Math.sin(this.angle - Math.PI / 2); // If spriteData.height is forward
        
        // A more common approach: offset along the ship's current angle from its center
        const forwardOffset = this.spriteData.height / 2; // Assume nose is 'height / 2' units forward from center
        const bulletStartX = (this.x + this.spriteData.width / 2) + Math.cos(this.angle) * forwardOffset;
        const bulletStartY = (this.y + this.spriteData.height / 2) + Math.sin(this.angle) * forwardOffset;


        if (this.currentWeapon) {
            const newProjectiles = this.currentWeapon.fire(bulletStartX, bulletStartY, this.angle, this.canvas, this.ctx);
            if (newProjectiles && newProjectiles.length > 0) {
                this.bullets.push(...newProjectiles); // Add to spaceship's local list
                                                     // main.js will pick these up and add to global gameObjects
            }
        } else {
            // Fallback basic shot if no weapon equipped (though constructor now equips one)
            const fallbackProjectile = new LaserProjectile(this, bulletStartX, bulletStartY, this.angle, this.canvas, this.ctx);
            this.bullets.push(fallbackProjectile);
            console.warn(`${this.spriteData.name || 'Spaceship'} fired with fallback, no weapon was equipped.`);
        }
    }

    takeDamage(amount) {
        if (!this.isActive) return; // Already destroyed

        if (this.isShieldActive) {
            // console.log(`${this.spriteData.name || 'Spaceship'} shield absorbed ${amount} damage!`);
            return; // Shield absorbs all damage
        }
        this.health -= amount;
        // console.log(`${this.spriteData.name || 'Spaceship'} took ${amount} damage, health is now ${this.health}`);
        if (this.health <= 0) {
            this.health = 0;
            this.destroy(); // Mark for removal from game
            // console.log(`${this.spriteData.name || 'Spaceship'} destroyed!`);
        }
    }

    equipWeapon(weaponInstance) {
        this.currentWeapon = weaponInstance;
        // console.log(`${this.spriteData.name || 'Spaceship'} equipped ${weaponInstance.constructor.name}`);
    }

    activateShield(duration) {
        if (!this.isActive) return;
        this.isShieldActive = true;
        this.shieldTimer = duration; // Duration in seconds
        // console.log(`${this.spriteData.name || 'Spaceship'} shield activated for ${duration} seconds.`);
    }
    
    // Overriding GameObject's checkCollisionWith if a more specific circular check is needed for spaceships
    // For now, we'll rely on GameObject's AABB, or implement specific checks in the main collision loop.
    // If we keep this, it should be clear what 'otherObject.size' refers to.
    // For AABB with another GameObject: return super.checkCollisionWith(otherObject);
    
    // Example of a more specific circular collision for Spaceship vs Asteroid (if asteroid has a 'size' radius)
    collidesWithAsteroid(asteroid) {
        if (!this.isActive || !asteroid.isActive) return false;

        const centerX1 = this.x + this.spriteData.width / 2;
        const centerY1 = this.y + this.spriteData.height / 2;
        const radius1 = Math.min(this.spriteData.width, this.spriteData.height) / 2; // Approx radius

        const centerX2 = asteroid.x + asteroid.spriteData.width / 2; // Assuming asteroid is also a GameObject
        const centerY2 = asteroid.y + asteroid.spriteData.height / 2;
        const radius2 = asteroid.spriteData.size / 2 || Math.min(asteroid.spriteData.width, asteroid.spriteData.height) / 2; // Use 'size' if available

        const dx = centerX1 - centerX2;
        const dy = centerY1 - centerY2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (radius1 + radius2);
    }


    setZoomLevel(zoomLevel) { // Kept for direct control if needed, though update loop also passes it
        this.zoomLevel = zoomLevel;
    }
}
