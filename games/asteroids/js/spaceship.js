import { LaserProjectile } from "./bullet.js"; // Assuming LaserProjectile is in bullet.js
import { GameObject } from "./GameObject.js";
import { LaserWeapon } from "./LaserWeapon.js";
import { PlasmaWeapon } from "./PlasmaWeapon.js";

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
        // Image loading is now handled by the GameObject base class (this.image)

        if (this.spriteData.ai) {
            this.ai = this.spriteData.ai;
        }

        // New properties from the enhancement plan
        this.health = this.spriteData.health || 100;
        this.isShieldActive = false;
        this.shieldTimer = 0; // Seconds
        this.bullets = []; // Stores projectiles fired by this ship

        this.currentWeapon = null;
        this.temporaryEffects = {}; // To store active temporary effects { type: { timer, revertCallback } }

        // Equip default weapon based on spriteData
        const defaultWeaponType = this.spriteData.defaultWeaponType || 'laser';
        this.equipWeapon(defaultWeaponType);
        this.isThrusting = false; // For player-controlled thrust
    }

    applyThrust(deltaTime) {
        if (!this.spriteData || typeof this.spriteData.thrust !== 'number') {
            console.warn(`Spaceship ${this.spriteData.name} has no thrust property in spriteData.`);
            return;
        }
        // thrust is now an acceleration value (pixels/sec^2)
        // Change in velocity (momentum) = acceleration * time
        this.momentumX += Math.cos(this.angle) * this.spriteData.thrust * deltaTime * 100; // Multiplier to make thrust feel responsive
        this.momentumY += Math.sin(this.angle) * this.spriteData.thrust * deltaTime * 100; // Adjust multiplier as needed
    }

    addTemporaryEffect(effectType, duration, revertCallback) {
        // If an effect of the same type is already active, clear its old timer/callback
        // or decide if multiple instances are allowed (for now, assume override/refresh)
        if (this.temporaryEffects[effectType] && this.temporaryEffects[effectType].clearTimeoutId) {
            clearTimeout(this.temporaryEffects[effectType].clearTimeoutId);
        }

        this.temporaryEffects[effectType] = {
            timer: duration,
            revertCallback: revertCallback,
            // Store timeout ID if we want to clear it explicitly later, though direct timer countdown is also fine
            // clearTimeoutId: setTimeout(() => {
            //     if (this.temporaryEffects[effectType]) { // Check if still exists
            //         revertCallback(this);
            //         delete this.temporaryEffects[effectType];
            //     }
            // }, duration * 1000)
        };
        console.log(`Effect ${effectType} activated for ${duration}s on ${this.spriteData.name}`);
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

        // Apply player-controlled thrust
        if (this.isThrusting && !this.ai) { // AI will handle its own thrust via its behavior function
            this.applyThrust(deltaTime);
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
                // Deactivation sound will be handled in main.js by observing state change
                // console.log("Shield deactivated");
            }
        }

        // Update current weapon cooldown
        if (this.currentWeapon) {
            this.currentWeapon.update(deltaTime);
        }

        // Update temporary effects
        for (const effectType in this.temporaryEffects) {
            const effect = this.temporaryEffects[effectType];
            effect.timer -= deltaTime;
            if (effect.timer <= 0) {
                if (effect.revertCallback) {
                    effect.revertCallback(this); // Pass spaceship instance to the callback
                }
                delete this.temporaryEffects[effectType];
                console.log(`Effect ${effectType} expired and reverted on ${this.spriteData.name}`);
            }
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

        if (this.image && this.image.complete && this.image.naturalWidth !== 0) { // Use this.image from GameObject
            this.ctx.drawImage(
                this.image, // Use this.image
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
                                                     // GameManager will now pick these up
                return { weaponType: this.currentWeapon.weaponType || 'unknown', projectiles: newProjectiles };
            }
            return null; // No projectile fired (e.g. cooldown)
        } else {
            // Fallback basic shot if no weapon equipped (though constructor now equips one)
            const fallbackProjectile = new LaserProjectile(this, bulletStartX, bulletStartY, this.angle, this.canvas, this.ctx);
            this.bullets.push(fallbackProjectile);
            console.warn(`${this.spriteData.name || 'Spaceship'} fired with fallback, no weapon was equipped.`);
            return { weaponType: 'laser', projectiles: [fallbackProjectile] }; // Fallback is a laser
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

    equipWeapon(weaponType) {
        if (!this.spriteData.weapons || this.spriteData.weapons.length === 0) {
            console.warn(`No weapons defined in spriteData for ${this.spriteData.name}. Equipping fallback LaserWeapon.`);
            this.currentWeapon = new LaserWeapon(this); // Fallback
            return;
        }

        const weaponData = this.spriteData.weapons.find(w => w.type === weaponType);

        if (!weaponData) {
            console.warn(`Weapon type "${weaponType}" not found in spriteData for ${this.spriteData.name}. Equipping default or first available.`);
            // Fallback to default or first weapon in the list
            const fallbackType = this.spriteData.defaultWeaponType || this.spriteData.weapons[0].type;
            const fallbackData = this.spriteData.weapons.find(w => w.type === fallbackType);
            if (fallbackData) {
                this.equipWeapon(fallbackType); // Recursive call with a valid type
            } else {
                this.currentWeapon = new LaserWeapon(this); // Absolute fallback
                console.error(`Absolute fallback: ${this.spriteData.name} equipped generic LaserWeapon.`);
            }
            return;
        }

        if (weaponType === 'laser') {
            this.currentWeapon = new LaserWeapon(this, weaponData);
        } else if (weaponType === 'plasma') {
            this.currentWeapon = new PlasmaWeapon(this, weaponData);
        } else {
            console.error(`Unknown weapon type: ${weaponType}. Cannot equip.`);
            return;
        }
        console.log(`${this.spriteData.name || 'Spaceship'} equipped ${this.currentWeapon.name || weaponType}`);
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
        const radius1 = Math.min(this.spriteData.width, this.spriteData.height) / 2; // Approx radius for spaceship

        // Assuming asteroid.x and asteroid.y are its center (consistent with Asteroid.draw and GameObject.checkCollisionWith)
        const centerX2 = asteroid.x;
        const centerY2 = asteroid.y;
        // asteroid.size is used as the radius in Asteroid.draw()
        const radius2 = asteroid.size || (asteroid.spriteData && asteroid.spriteData.size) || Math.min(asteroid.width, asteroid.height) / 2; // Use asteroid.size (which should be set from spriteData.size)

        const dx = centerX1 - centerX2;
        const dy = centerY1 - centerY2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < (radius1 + radius2);
    }


    setZoomLevel(zoomLevel) { // Kept for direct control if needed, though update loop also passes it
        this.zoomLevel = zoomLevel;
    }

    onDestruction() {
        // Called when the spaceship is destroyed.
        // Can return a power-up type string to be spawned, or null.
        if (this.ai) { // Only enemy ships drop power-ups for now
            const dropChance = this.spriteData.powerUpDropChance || 0.25; // Default 25% chance
            if (Math.random() < dropChance) {
                const availablePowerUps = ['shield_invulnerability', 'weapon_upgrade', 'speed_boost'];
                // Potentially filter availablePowerUps based on spriteData.possiblePowerUps
                const randomIndex = Math.floor(Math.random() * availablePowerUps.length);
                console.log(`${this.spriteData.name} dropped power-up: ${availablePowerUps[randomIndex]}`);
                return availablePowerUps[randomIndex];
            }
        }
        return null; // No power-up dropped
    }
}
