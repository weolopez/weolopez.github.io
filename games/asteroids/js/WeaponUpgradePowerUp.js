import { PowerUp } from "./PowerUp.js";
import { PlasmaWeapon } from "./PlasmaWeapon.js";
import { LaserWeapon } from "./LaserWeapon.js"; // Assuming LaserWeapon is the default

export class WeaponUpgradePowerUp extends PowerUp {
    constructor(spriteData, canvas, ctx, duration = 10) { // Default duration 10 seconds
        super(spriteData, canvas, ctx, 'weapon_upgrade', duration);
        this.originalWeaponType = null; // To store the type (string) of the original weapon
    }

    applyEffect(spaceship) {
        if (!spaceship || !spaceship.currentWeapon) return;

        // Store the type of the current weapon
        this.originalWeaponType = spaceship.currentWeapon.weaponType || 'laser'; // Fallback to 'laser'

        // Check if the spaceship can equip plasma weapon
        const canEquipPlasma = spaceship.spriteData.weapons && spaceship.spriteData.weapons.some(w => w.type === 'plasma');

        if (canEquipPlasma) {
            spaceship.equipWeapon('plasma'); // equipWeapon now handles finding data and instantiating
            console.log(`${spaceship.spriteData.name} equipped Plasma Weapon (PowerUp). Duration: ${this.duration}s. Original: ${this.originalWeaponType}`);

            // Set a timer on the spaceship to revert the weapon
            spaceship.addTemporaryEffect('weapon_upgrade', this.duration, () => {
                this.revertEffect(spaceship);
            });
        } else {
            console.warn(`Spaceship ${spaceship.spriteData.name} cannot equip Plasma. Weapon upgrade power-up has no effect.`);
            // If plasma weapon can't be equipped, don't change the weapon.
            // The power-up will still be "collected" and disappear.
            this.originalWeaponType = null; // Clear as no change was made.
            return;
        }
    }

    revertEffect(spaceship) {
        if (!spaceship) return;

        if (this.originalWeaponType) {
            spaceship.equipWeapon(this.originalWeaponType);
            console.log(`${spaceship.spriteData.name} reverted to ${this.originalWeaponType}.`);
        } else {
            // If originalWeaponType was somehow not set, try reverting to default from spriteData
            const defaultWeapon = spaceship.spriteData.defaultWeaponType || 'laser';
            spaceship.equipWeapon(defaultWeapon);
            console.warn(`${spaceship.spriteData.name} reverted to default weapon ${defaultWeapon} due to missing original type.`);
        }
        this.originalWeaponType = null; // Clear stored weapon type
    }
}