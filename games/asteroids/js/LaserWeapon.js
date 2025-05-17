import { Weapon } from "./Weapon.js";
import { LaserProjectile } from "./bullet.js"; // Assuming LaserProjectile is in bullet.js

export class LaserWeapon extends Weapon {
    constructor(owner) {
        const fireRate = 5; // Shots per second
        const projectileSpeed = 700; // Pixels per second
        const projectileDamage = 10;
        // LaserProjectile handles its own visual spriteData internally for now
        super(owner, fireRate, projectileSpeed, projectileDamage, null);
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