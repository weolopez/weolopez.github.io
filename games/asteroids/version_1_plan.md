# Asteroids Enhancement Plan

The goal is to refactor the current codebase to support new features: two distinct weapon types (fast laser, powerful plasma bolt), a temporary invulnerability shield power-up, AI that attempts to flank the player, and varied enemy ship designs.

## Phase 1: Core Refactoring & Base Classes

This phase focuses on creating a more robust and extensible foundation for the game.

1.  **Entity Management System:**
    *   **File:** [`games/asteroids/js/main.js`](games/asteroids/js/main.js) (or a new `GameManager.js`)
    *   **Task:** Modify the main game loop to manage a dynamic list of all active game entities (player, enemies, projectiles, power-ups, asteroids). This will involve creating arrays to hold these entities and iterating through them for updates and drawing.
    *   **Details:** Introduce a central place (e.g., a `GameManager` class or an object in `main.js`) to handle:
        *   Spawning new entities.
        *   Removing destroyed entities.
        *   Overseeing the main game loop (`updateAll`, `drawAll`).

2.  **Base `GameObject` Class:**
    *   **File:** Create `games/asteroids/js/GameObject.js`
    *   **Task:** Define a base class from which all interactive game elements will inherit.
    *   **Properties:** `x`, `y` (position), `width`, `height` (dimensions for collision/drawing), `angle` (orientation), `speed` (current movement speed), `momentumX`, `momentumY`, `spriteData` (reference to its definition from [`games/asteroids/js/sprites.js`](games/asteroids/js/sprites.js)), `isActive` (boolean to mark for removal).
    *   **Methods:**
        *   `constructor(spriteData, canvas, ctx)`
        *   `update(deltaTime)`: Abstract method for game logic.
        *   `draw()`: Abstract method for rendering.
        *   `destroy()`: Sets `isActive = false`.
        *   `checkCollisionWith(otherObject)`: Basic AABB or circular collision check.

3.  **Refactor Existing Classes to use `GameObject`:**
    *   **[`games/asteroids/js/spaceship.js`](games/asteroids/js/spaceship.js):**
        *   Inherit from `GameObject`.
        *   **New Properties:** `health`, `currentWeapon` (will hold a `Weapon` instance), `isShieldActive` (boolean), `shieldTimer` (number).
        *   **Updated Methods:**
            *   Constructor to take `spriteData`.
            *   `shoot()`: Will now call `this.currentWeapon.fire(this)`.
            *   Initialize `this.bullets = []` in the constructor.
            *   Ensure bullet drawing and updating logic (currently commented out) is functional and integrated into the main `update()` and `draw()` methods, iterating over `this.bullets`.
        *   **New Methods:** `takeDamage(amount)`, `equipWeapon(weaponInstance)`, `activateShield(duration)`.
    *   **[`games/asteroids/js/asteroid.js`](games/asteroids/js/asteroid.js) (as `Asteroid.js`):**
        *   Inherit from `GameObject`.
        *   **New Properties:** `health`.
        *   **New Methods:** `takeDamage(amount)`, `onDestruction()` (e.g., to spawn power-ups or smaller asteroids).
    *   **[`games/asteroids/js/bullet.js`](games/asteroids/js/bullet.js) (as `Projectile.js` - base class for projectiles):**
        *   Inherit from `GameObject`.
        *   **New Properties:** `damage`, `owner` (the `Spaceship` that fired it, to prevent self-collision and assign score).
        *   The existing `Bullet` class can become `LaserProjectile.js` inheriting from this new `Projectile.js`.

4.  **Collision Detection & Response System:**
    *   **File:** [`games/asteroids/js/main.js`](games/asteroids/js/main.js) or `GameManager.js`
    *   **Task:** Implement a centralized collision detection loop.
    *   **Details:**
        *   Iterate through relevant pairs of active `GameObject`s (e.g., player projectiles vs. enemies, enemy projectiles vs. player, player vs. asteroids, player vs. power-ups).
        *   When a collision is detected (using `checkCollisionWith`), call appropriate methods on the involved objects (e.g., `target.takeDamage(projectile.damage)`, `projectile.destroy()`, `player.collectPowerUp(powerUp)`).
        *   Re-enable and adapt the existing collision logic from [`games/asteroids/js/main.js:57-64`](games/asteroids/js/main.js:57-64) and [`games/asteroids/js/spaceship.js:86-95`](games/asteroids/js/spaceship.js:86-95) within this new system.

## Phase 2: Weapon System Implementation

This phase introduces the specified weapon types.

1.  **`Weapon` Base Class:**
    *   **File:** Create `games/asteroids/js/Weapon.js`
    *   **Task:** Define a base class for all weapon types.
    *   **Properties:** `owner` (the spaceship holding the weapon), `fireRate` (shots per second), `cooldownTimer` (internal timer), `projectileSpeed`, `projectileDamage`, `projectileSprite` (if visual variation needed).
    *   **Methods:**
        *   `constructor(owner, fireRate, projectileSpeed, projectileDamage)`
        *   `update(deltaTime)`: Manages `cooldownTimer`.
        *   `canFire()`: Returns true if `cooldownTimer <= 0`.
        *   `fire()`: Abstract method. Creates and returns a `Projectile` instance if `canFire()` is true, then resets `cooldownTimer`.

2.  **`LaserWeapon` Class:**
    *   **File:** Create `games/asteroids/js/LaserWeapon.js`
    *   **Task:** Implements the fast laser.
    *   Inherits from `Weapon`.
    *   Constructor sets a high `fireRate` and appropriate `projectileDamage` / `projectileSpeed`.
    *   `fire()`: Creates and returns a `LaserProjectile` instance.

3.  **`PlasmaWeapon` Class:**
    *   **File:** Create `games/asteroids/js/PlasmaWeapon.js`
    *   **Task:** Implements the slower, powerful plasma bolt.
    *   Inherits from `Weapon`.
    *   Constructor sets a lower `fireRate` but higher `projectileDamage` / potentially different `projectileSpeed`.
    *   `fire()`: Creates and returns a `PlasmaProjectile` instance.

4.  **`LaserProjectile` Class:**
    *   **File:** Refactor [`games/asteroids/js/bullet.js`](games/asteroids/js/bullet.js) to `games/asteroids/js/LaserProjectile.js`
    *   Inherits from `Projectile`.
    *   Specific visual style (e.g., thin line).

5.  **`PlasmaProjectile` Class:**
    *   **File:** Create `games/asteroids/js/PlasmaProjectile.js`
    *   Inherits from `Projectile`.
    *   Specific visual style (e.g., larger, glowing ball) and potentially different movement behavior.

6.  **Integration:**
    *   In `Spaceship.constructor` or `equipWeapon()`: Instantiate and assign a default weapon (e.g., `this.currentWeapon = new LaserWeapon(this, ...)`).
    *   Player input in [`games/asteroids/js/main.js:185`](games/asteroids/js/main.js:185) for 'Space' key should call `playerSpaceship.currentWeapon.fire()`. The projectiles returned should be added to the main game's list of active entities.

## Phase 3: Shield System (Power-up) Implementation

This phase adds the temporary invulnerability shield.

1.  **`PowerUp` Base Class:**
    *   **File:** Create `games/asteroids/js/PowerUp.js`
    *   Inherits from `GameObject`.
    *   **Properties:** `type` (e.g., 'shield_invulnerability'), `duration`.
    *   **Methods:**
        *   `applyEffect(spaceship)`: Abstract method.
        *   `onCollected(spaceship)`: Calls `applyEffect` and then `this.destroy()`.

2.  **`ShieldInvulnerabilityPowerUp` Class:**
    *   **File:** Create `games/asteroids/js/ShieldInvulnerabilityPowerUp.js`
    *   Inherits from `PowerUp`.
    *   Constructor sets `type` and `duration`.
    *   `applyEffect(spaceship)`: Calls `spaceship.activateShield(this.duration)`.

3.  **`Spaceship` Shield Logic Updates:**
    *   **File:** [`games/asteroids/js/spaceship.js`](games/asteroids/js/spaceship.js)
    *   `activateShield(duration)`: Sets `this.isShieldActive = true` and `this.shieldTimer = duration`.
    *   In `update(deltaTime)`: If `isShieldActive` is true, decrement `shieldTimer`. If `shieldTimer <= 0`, set `isShieldActive = false`.
    *   In `takeDamage(amount)`: If `this.isShieldActive` is true, return immediately (no damage taken).
    *   In `draw()`: If `isShieldActive` is true, draw a visual indicator (e.g., a translucent bubble or aura around the ship).

4.  **Spawning Power-ups:**
    *   Modify `Asteroid.onDestruction()` and/or create `EnemySpaceship.onDestruction()` to have a chance of spawning a `ShieldInvulnerabilityPowerUp` at the destroyed object's location. The power-up is then added to the main game's list of active entities.

## Phase 4: AI Enhancements

This phase focuses on implementing the flanking behavior for AI enemies.

1.  **AI Controller/Behavior Logic:**
    *   **File:** Can be part of `EnemySpaceship.js` or a new `games/asteroids/js/AIController.js`.
    *   **Task:** The existing `this.ai = this.sprite.ai` in [`games/asteroids/js/spaceship.js:31-33`](games/asteroids/js/spaceship.js:31-33) will be the hook. The function defined in [`games/asteroids/js/sprites.js`](games/asteroids/js/sprites.js) for AI ships will contain this new logic.
    *   **States:** Consider a simple state machine for AI: `SEEKING_PLAYER`, `FLANKING_MANEUVER`, `ATTACKING`.
    *   **Flanking Logic:**
        *   Inputs: Player's position and orientation, AI's current position.
        *   Calculate a target flanking point: This could be a point offset to the side and slightly behind the player, or a point that creates a crossfire opportunity if multiple AIs are present (more advanced).
        *   The AI will navigate towards this flanking point.
        *   Once in a flanking position (or if the player moves significantly), re-evaluate.
    *   **Targeting & Firing:**
        *   While flanking or attacking, the AI should attempt to aim at the player.
        *   Call its `currentWeapon.fire()` method when appropriate (e.g., has a clear shot, weapon is off cooldown).
    *   **Movement:** Update AI's `momentumX`, `momentumY`, and `rotationSpeed` to move towards its current target point (flanking position or player).

2.  **Integration with `EnemySpaceship`:**
    *   The `update()` method of an `EnemySpaceship` will call its AI behavior function, passing necessary game state information (e.g., player reference, list of other entities for obstacle avoidance if implemented later).

## Phase 5: Enemy Variety

This phase introduces different enemy ship designs.

1.  **Update Sprite Definitions:**
    *   **File:** [`games/asteroids/js/sprites.js`](games/asteroids/js/sprites.js)
    *   **Task:** Define new configurations for enemy ships.
    *   **New/Modified Properties for each enemy sprite definition:**
        *   `type`: e.g., 'enemy_scout', 'enemy_fighter'.
        *   `health`: (integer).
        *   `max_speed`: (number).
        *   `weaponType`: (string, e.g., 'laser' or 'plasma') - used by the `EnemySpaceship` constructor to equip the correct weapon.
        *   `aiBehavior`: (string or function reference) - to assign specific AI logic (though "flanking" is the primary one for now, this allows future expansion).
        *   Visual properties like `src`, `x`, `y` (from spritesheet), `width`, `height`, `scale` as already present.

2.  **Enemy Spawning Logic:**
    *   **File:** [`games/asteroids/js/main.js`](games/asteroids/js/main.js) or `GameManager.js`
    *   **Task:** Implement logic to spawn different types of enemies.
    *   **Details:** When spawning an enemy, select a sprite definition from [`games/asteroids/js/sprites.js`](games/asteroids/js/sprites.js) and pass it to the `EnemySpaceship` constructor. The constructor will then use these properties (health, speed, weapon type) to initialize the enemy.
    *   Spawning could be wave-based, timed, or triggered by game events.

## Mermaid Diagrams:

**Updated Class Inheritance & Key Components:**

```mermaid
graph TD
    subgraph Core
        GameObjectBase[GameObject]
    end

    subgraph Entities
        GameObjectBase --> Spaceship
        GameObjectBase --> ProjectileBase[Projectile]
        GameObjectBase --> Asteroid
        GameObjectBase --> PowerUpBase[PowerUp]
    end

    subgraph Spaceships
        Spaceship --> PlayerSpaceship
        Spaceship --> EnemySpaceship
    end

    subgraph Projectiles
        ProjectileBase --> LaserProjectile
        ProjectileBase --> PlasmaProjectile
    end

    subgraph Weapons
        WeaponBase[Weapon]
        WeaponBase --> LaserWeapon
        WeaponBase --> PlasmaWeapon
    end

    subgraph PowerUps
        PowerUpBase --> ShieldInvulnerabilityPowerUp
    end

    subgraph GameLogic
        GameManager
        SpriteDefinitions[sprites.js Data]
        AIController
    end

    PlayerSpaceship -- uses --> WeaponBase
    EnemySpaceship -- uses --> WeaponBase
    EnemySpaceship -- controlled by --> AIController
    WeaponBase -- creates --> ProjectileBase
    Spaceship -- collects --> PowerUpBase
    PowerUpBase -- affects --> Spaceship
    GameManager -- manages --> GameObjectBase
    GameManager -- uses data from --> SpriteDefinitions
    Asteroid -- may drop --> PowerUpBase
    EnemySpaceship -- may drop --> PowerUpBase