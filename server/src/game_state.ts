import { Player } from "./player.ts";
import { Vector2D, PlayerData, BulletData, AsteroidData, GameStateData, InputCommand } from "./types.ts";

interface Bullet {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  ownerId: string;
  timeToLive: number;
}

interface Asteroid {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  size: 'large' | 'medium' | 'small';
  health: number;
}

export class GameState {
  private players: Map<string, Player>;
  private bullets: Map<string, Bullet>;
  private asteroids: Map<string, Asteroid>;
  private nextBulletId: number;
  private nextAsteroidId: number;
  
  // Game world constants
  private readonly WORLD_WIDTH = 800;
  private readonly WORLD_HEIGHT = 600;
  private readonly BULLET_SPEED = 400;
  private readonly BULLET_LIFETIME = 3; // seconds
  private readonly BULLET_DAMAGE = 25;

  constructor() {
    this.players = new Map();
    this.bullets = new Map();
    this.asteroids = new Map();
    this.nextBulletId = 0;
    this.nextAsteroidId = 0;
    
    // Initialize with some asteroids
    this.spawnInitialAsteroids();
  }

  public addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
  }

  public processPlayerInput(playerId: string, input: InputCommand): void {
    const player = this.players.get(playerId);
    if (!player) return;

    if (input.type === 'fire') {
      this.createBullet(player);
    } else {
      // Let the player handle movement and rotation inputs
      player.processInput(input, 1/60); // Assuming 60 FPS for input processing
    }
  }

  public update(deltaTime: number): void {
    // Update all players
    for (const player of this.players.values()) {
      player.update(deltaTime, this.WORLD_WIDTH, this.WORLD_HEIGHT);
    }

    // Update bullets
    this.updateBullets(deltaTime);

    // Update asteroids
    this.updateAsteroids(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Spawn new asteroids if needed
    this.maintainAsteroidCount();
  }

  private createBullet(player: Player): void {
    const bulletId = `bullet_${this.nextBulletId++}`;
    
    // Calculate bullet starting position (slightly in front of player)
    const offsetDistance = 20;
    const startX = player.position.x + Math.cos(player.rotation) * offsetDistance;
    const startY = player.position.y + Math.sin(player.rotation) * offsetDistance;

    // Calculate bullet velocity
    const bulletVelX = Math.cos(player.rotation) * this.BULLET_SPEED + player.velocity.x;
    const bulletVelY = Math.sin(player.rotation) * this.BULLET_SPEED + player.velocity.y;

    const bullet: Bullet = {
      id: bulletId,
      position: { x: startX, y: startY },
      velocity: { x: bulletVelX, y: bulletVelY },
      ownerId: player.id,
      timeToLive: this.BULLET_LIFETIME
    };

    this.bullets.set(bulletId, bullet);
  }

  private updateBullets(deltaTime: number): void {
    const bulletsToRemove: string[] = [];

    for (const [bulletId, bullet] of this.bullets) {
      // Update position
      bullet.position.x += bullet.velocity.x * deltaTime;
      bullet.position.y += bullet.velocity.y * deltaTime;

      // Wrap around screen edges
      bullet.position.x = ((bullet.position.x % this.WORLD_WIDTH) + this.WORLD_WIDTH) % this.WORLD_WIDTH;
      bullet.position.y = ((bullet.position.y % this.WORLD_HEIGHT) + this.WORLD_HEIGHT) % this.WORLD_HEIGHT;

      // Update time to live
      bullet.timeToLive -= deltaTime;

      // Mark for removal if expired
      if (bullet.timeToLive <= 0) {
        bulletsToRemove.push(bulletId);
      }
    }

    // Remove expired bullets
    for (const bulletId of bulletsToRemove) {
      this.bullets.delete(bulletId);
    }
  }

  private updateAsteroids(deltaTime: number): void {
    for (const asteroid of this.asteroids.values()) {
      // Update position
      asteroid.position.x += asteroid.velocity.x * deltaTime;
      asteroid.position.y += asteroid.velocity.y * deltaTime;

      // Update rotation
      asteroid.rotation += 0.5 * deltaTime; // Slow rotation

      // Wrap around screen edges
      asteroid.position.x = ((asteroid.position.x % this.WORLD_WIDTH) + this.WORLD_WIDTH) % this.WORLD_WIDTH;
      asteroid.position.y = ((asteroid.position.y % this.WORLD_HEIGHT) + this.WORLD_HEIGHT) % this.WORLD_HEIGHT;
    }
  }

  private checkCollisions(): void {
    // Check bullet-asteroid collisions
    for (const [bulletId, bullet] of this.bullets) {
      for (const [asteroidId, asteroid] of this.asteroids) {
        if (this.isColliding(bullet.position, asteroid.position, this.getAsteroidRadius(asteroid.size))) {
          // Handle collision
          this.handleBulletAsteroidCollision(bulletId, asteroidId);
          break; // Bullet can only hit one asteroid
        }
      }
    }

    // Check player-asteroid collisions
    for (const player of this.players.values()) {
      for (const asteroid of this.asteroids.values()) {
        if (this.isColliding(player.position, asteroid.position, this.getAsteroidRadius(asteroid.size))) {
          // Handle collision (damage player)
          const isDead = player.takeDamage(20);
          if (isDead) {
            // Respawn player at random location
            player.position.x = Math.random() * this.WORLD_WIDTH;
            player.position.y = Math.random() * this.WORLD_HEIGHT;
            player.velocity.x = 0;
            player.velocity.y = 0;
            player.health = 100; // Reset health
          }
        }
      }
    }
  }

  private isColliding(pos1: Vector2D, pos2: Vector2D, radius: number): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  }

  private getAsteroidRadius(size: 'large' | 'medium' | 'small'): number {
    switch (size) {
      case 'large': return 40;
      case 'medium': return 25;
      case 'small': return 15;
    }
  }

  private handleBulletAsteroidCollision(bulletId: string, asteroidId: string): void {
    const bullet = this.bullets.get(bulletId);
    const asteroid = this.asteroids.get(asteroidId);
    
    if (!bullet || !asteroid) return;

    // Remove bullet
    this.bullets.delete(bulletId);

    // Damage asteroid
    asteroid.health -= this.BULLET_DAMAGE;

    // Award points to player
    const player = this.players.get(bullet.ownerId);
    if (player) {
      player.addScore(10);
    }

    // Destroy asteroid if health is depleted
    if (asteroid.health <= 0) {
      this.asteroids.delete(asteroidId);
      
      // Split large asteroids into smaller ones
      if (asteroid.size === 'large') {
        this.createSmallerAsteroids(asteroid, 'medium', 2);
      } else if (asteroid.size === 'medium') {
        this.createSmallerAsteroids(asteroid, 'small', 2);
      }
      
      // Award bonus points for destroying asteroid
      if (player) {
        player.addScore(asteroid.size === 'large' ? 50 : asteroid.size === 'medium' ? 30 : 20);
      }
    }
  }

  private createSmallerAsteroids(parentAsteroid: Asteroid, size: 'medium' | 'small', count: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 50;
      
      const asteroid: Asteroid = {
        id: `asteroid_${this.nextAsteroidId++}`,
        position: { ...parentAsteroid.position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        rotation: Math.random() * Math.PI * 2,
        size: size,
        health: size === 'medium' ? 50 : 25
      };
      
      this.asteroids.set(asteroid.id, asteroid);
    }
  }

  private spawnInitialAsteroids(): void {
    for (let i = 0; i < 5; i++) {
      this.spawnRandomAsteroid('large');
    }
  }

  private spawnRandomAsteroid(size: 'large' | 'medium' | 'small'): void {
    const asteroid: Asteroid = {
      id: `asteroid_${this.nextAsteroidId++}`,
      position: {
        x: Math.random() * this.WORLD_WIDTH,
        y: Math.random() * this.WORLD_HEIGHT
      },
      velocity: {
        x: (Math.random() - 0.5) * 100,
        y: (Math.random() - 0.5) * 100
      },
      rotation: Math.random() * Math.PI * 2,
      size: size,
      health: size === 'large' ? 75 : size === 'medium' ? 50 : 25
    };
    
    this.asteroids.set(asteroid.id, asteroid);
  }

  private maintainAsteroidCount(): void {
    const minAsteroids = 3;
    if (this.asteroids.size < minAsteroids) {
      this.spawnRandomAsteroid('large');
    }
  }

  public serialize(): GameStateData {
    return {
      players: Array.from(this.players.values()).map(player => player.serialize()),
      bullets: Array.from(this.bullets.values()).map(bullet => ({
        id: bullet.id,
        position: { ...bullet.position },
        velocity: { ...bullet.velocity },
        ownerId: bullet.ownerId,
        timeToLive: bullet.timeToLive
      })),
      asteroids: Array.from(this.asteroids.values()).map(asteroid => ({
        id: asteroid.id,
        position: { ...asteroid.position },
        velocity: { ...asteroid.velocity },
        rotation: asteroid.rotation,
        size: asteroid.size,
        health: asteroid.health
      })),
      timestamp: Date.now()
    };
  }
}