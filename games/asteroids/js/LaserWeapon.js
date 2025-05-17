import { Weapon } from "./Weapon.js";
import { LaserProjectile } from "./bullet.js"; // Assuming LaserProjectile is in bullet.js

export class LaserWeapon extends Weapon {
    constructor(owner, weaponData = {}) {
        const fireRate = weaponData.fireRate || 5; // Shots per second
        const projectileSpeed = weaponData.projectileSpeed || 700; // Pixels per second
        const projectileDamage = weaponData.projectileDamage || 10;
        const projectileSpriteData = weaponData.projectileSpriteData || null; // Example if projectiles also have sprites defined here

        super(owner, fireRate, projectileSpeed, projectileDamage, projectileSpriteData);
        this.weaponType = 'laser';
        this.name = weaponData.name || 'Laser Cannon'; // Store the name from spriteData
    }

    fire(shooterX, shooterY, shooterAngle, canvas, ctx) {
        if (this.canFire()) {
            this.cooldownTimer = this.cooldownTime;
            const newProjectile = new LaserProjectile(
                this.owner,
                shooterX,
                shooterY,
                shooterAngle,
                canvas,
                ctx
                // Projectile speed and damage are now passed to Weapon's constructor
                // and LaserProjectile constructor uses its defaults or could take them.
                // For now, LaserProjectile's constructor sets its own speed/damage.
                // This could be refined so Weapon class dictates these to the projectile.
            );
            return [newProjectile]; // Return as an array
        }
        return [];
    }
}