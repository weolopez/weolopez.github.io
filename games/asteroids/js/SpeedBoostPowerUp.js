import { PowerUp } from "./PowerUp.js";

export class SpeedBoostPowerUp extends PowerUp {
    constructor(spriteData, canvas, ctx, duration = 8, speedMultiplier = 1.5) { // Default duration 8 seconds, 50% speed boost
        super(spriteData, canvas, ctx, 'speed_boost', duration);
        this.speedMultiplier = speedMultiplier;
        this.originalMaxSpeed = 0;
        // If spaceship has a separate acceleration property, store it too.
        // this.originalAcceleration = 0; 
    }

    applyEffect(spaceship) {
        if (!spaceship) return;

        this.originalMaxSpeed = spaceship.max_speed;
        spaceship.max_speed *= this.speedMultiplier;

        // If spaceship has an explicit acceleration property:
        // this.originalAcceleration = spaceship.acceleration;
        // spaceship.acceleration *= this.speedMultiplier; // Or a different factor

        console.log(`${spaceship.spriteData.name} got Speed Boost! Max speed: ${spaceship.max_speed}. Duration: ${this.duration}s`);

        spaceship.addTemporaryEffect('speed_boost', this.duration, () => {
            this.revertEffect(spaceship);
        });
    }

    revertEffect(spaceship) {
        if (!spaceship) return;

        spaceship.max_speed = this.originalMaxSpeed;
        // If spaceship has an explicit acceleration property:
        // spaceship.acceleration = this.originalAcceleration;

        console.log(`${spaceship.spriteData.name}'s Speed Boost expired. Max speed reverted to ${spaceship.max_speed}.`);
        this.originalMaxSpeed = 0; // Reset for potential re-collection
        // this.originalAcceleration = 0;
    }
}