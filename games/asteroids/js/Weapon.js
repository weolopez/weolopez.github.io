export class Weapon {
    constructor(owner, fireRate, projectileSpeed, projectileDamage, projectileSpriteData = null) {
        this.owner = owner; // The spaceship holding the weapon
        this.fireRate = fireRate; // Shots per second
        this.cooldownTime = 1 / this.fireRate; // Time between shots in seconds
        this.cooldownTimer = 0; // Current cooldown status

        this.projectileSpeed = projectileSpeed; // Speed of the projectile
        this.projectileDamage = projectileDamage; // Damage dealt by the projectile
        this.projectileSpriteData = projectileSpriteData; // Optional sprite data for the projectile
    }

    update(deltaTime) {
        if (this.cooldownTimer > 0) {
            this.cooldownTimer -= deltaTime;
        }
    }

    canFire() {
        return this.cooldownTimer <= 0;
    }

    // Abstract method - to be implemented by specific weapon types
    // Should create and return one or more projectile instances
    fire(shooterX, shooterY, shooterAngle, canvas, ctx) {
        if (this.canFire()) {
            this.cooldownTimer = this.cooldownTime;
            // console.warn("Fire method not implemented for", this.constructor.name);
            // Subclasses will return an array of new projectile(s)
            return []; 
        }
        return []; // Return empty array if cannot fire
    }
}