import { Weapon } from "./Weapon.js";
import { PlasmaProjectile } from "./PlasmaProjectile.js";

export class PlasmaWeapon extends Weapon {
    constructor(owner) {
        const fireRate = 1.5; // Slower shots per second
        const projectileSpeed = 400; // Pixels per second (defined in PlasmaProjectile)
        const projectileDamage = 35;  // (defined in PlasmaProjectile)
        // PlasmaProjectile handles its own visual spriteData internally
        super(owner, fireRate, projectileSpeed, projectileDamage, null);
    }

    fire(shooterX, shooterY, shooterAngle, canvas, ctx) {
        if (this.canFire()) {
            this.cooldownTimer = this.cooldownTime;
            const newProjectile = new PlasmaProjectile(
                this.owner,
                shooterX,
                shooterY,
                shooterAngle,
                canvas,
                ctx
            );
            return [newProjectile]; // Return as an array
        }
        return [];
    }
}