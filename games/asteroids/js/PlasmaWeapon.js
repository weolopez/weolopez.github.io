import { Weapon } from "./Weapon.js";
import { PlasmaProjectile } from "./PlasmaProjectile.js";

export class PlasmaWeapon extends Weapon {
    constructor(owner, weaponData = {}) {
        const fireRate = weaponData.fireRate || 1.5; // Slower shots per second
        const projectileSpeed = weaponData.projectileSpeed || 400; // Pixels per second
        const projectileDamage = weaponData.projectileDamage || 35;
        const projectileSpriteData = weaponData.projectileSpriteData || null;

        super(owner, fireRate, projectileSpeed, projectileDamage, projectileSpriteData);
        this.weaponType = 'plasma';
        this.name = weaponData.name || 'Plasma Launcher'; // Store the name from spriteData
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