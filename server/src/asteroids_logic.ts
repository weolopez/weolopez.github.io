import { IGameLogic } from "./game_room.ts";
import { ClientInputEvent, ServerGameEvent, PlayerData, BulletData, AsteroidData, Vector2D, InputCommand, PlayerStateUpdatePayload, BulletSpawnedPayload, AsteroidDestroyedPayload, PlayerHitPayload, PlayerRespawnedPayload } from "./types.ts";
import { Player } from "./player.ts"; // Reusing Player class for core player state/physics

// Custom event listener type
type GameEventListener = (event: ServerGameEvent) => void;

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

/**
 * AsteroidsGameLogic: Implements IGameLogic for the Asteroids game.
 * Manages game state, physics, and emits server events.
 */
export class AsteroidsGameLogic implements IGameLogic {
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
  private readonly INITIAL_ASTEROIDS = 5;
  private readonly MIN_ASTEROIDS = 3;

  // State update throttling
  private lastStateUpdateTime: number = 0;
  private readonly STATE_UPDATE_INTERVAL = 1000 / 20; // 20 updates per second

  // Custom event system
  private listeners: Map<'serverEvent', GameEventListener[]>;

  constructor() {
    this.players = new Map();
    this.bullets = new Map();
    this.asteroids = new Map();
    this.nextBulletId = 0;
    this.nextAsteroidId = 0;
    this.listeners = new Map();
    this.listeners.set('serverEvent', []); // Initialize listener array
    
    this.spawnInitialAsteroids();
  }

  // Custom event emitter methods to satisfy IGameLogic
  public on(eventName: 'serverEvent', listener: GameEventListener): void {
    this.listeners.get(eventName)?.push(listener);
  }

  public off(eventName: 'serverEvent', listener: GameEventListener): void {
    const currentListeners = this.listeners.get(eventName);
    if (currentListeners) {
      this.listeners.set(eventName, currentListeners.filter(l => l !== listener));
    }
  }

  private emit(eventName: 'serverEvent', event: ServerGameEvent): void {
    this.listeners.get(eventName)?.forEach(listener => listener(event));
  }

  /**
   * Processes a client input event for the Asteroids game.
   * @param playerId The ID of the player sending the input.
   * @param event The client input event.
   */
  public processInput(playerId: string, event: ClientInputEvent): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Cast payload to InputCommand as this logic expects it
    const inputCommand: InputCommand = event.payload;

    if (inputCommand.type === 'fire') {
      this.createBullet(player);
      // Emit a 'bulletSpawned' event
      this.emit('serverEvent', {
        type: 'bulletSpawned',
        senderId: 'server',
        timestamp: Date.now(),
        payload: {
          bulletId: `bullet_${this.nextBulletId - 1}`, // ID of the newly created bullet
          ownerId: player.id,
          position: { ...player.position }, // Initial position (will be updated by physics)
          velocity: { x: Math.cos(player.rotation) * this.BULLET_SPEED + player.velocity.x, y: Math.sin(player.rotation) * this.BULLET_SPEED + player.velocity.y }
        } as BulletSpawnedPayload
      } as ServerGameEvent);
    } else {
      // Let the player handle movement and rotation inputs
      // Pass the sequence number for reconciliation
      player.processInput(inputCommand, 1/60); // Assuming 60 FPS for input processing
    }
  }

  /**
   * Updates the game state for the Asteroids game.
   * @param deltaTime The time elapsed since the last update in seconds.
   */
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

    // Emit a periodic state update event for all players/entities (throttled)
    const currentTime = Date.now();
    if (currentTime - this.lastStateUpdateTime >= this.STATE_UPDATE_INTERVAL) {
      this.emit('serverEvent', {
        type: 'playerStateUpdate',
        senderId: 'server',
        timestamp: currentTime,
        payload: this.serializeGameState()
      } as ServerGameEvent);
      this.lastStateUpdateTime = currentTime;
    }
  }

  /**
   * Gets the initial game state for a new player joining the room.
   * @param playerId The ID of the player requesting the initial state.
   * @returns A ServerGameEvent containing the initial state.
   */
  public getInitialState(playerId: string): ServerGameEvent {
    console.log('getInitialState called for player:', playerId);
    // Add the new player to the game logic's state
    const newPlayer = new Player(playerId, Math.random() * this.WORLD_WIDTH, Math.random() * this.WORLD_HEIGHT);
    this.players.set(playerId, newPlayer);

    // Initialize asteroids if this is the first player
    if (this.asteroids.size === 0) {
      console.log('Initializing asteroids for first player');
      this.maintainAsteroidCount();
    }

    const gameState = this.serializeGameState();
    console.log('Serialized game state:', gameState);

    const event = {
      type: 'initialGameState',
      senderId: 'server',
      timestamp: Date.now(),
      payload: {
        ...gameState,
        targetPlayerId: playerId // Include the target player ID
      }
    } as ServerGameEvent;

    console.log('Returning initial state event:', event);
    return event;
  }

  /**
   * Gets the current full game state.
   * @returns A ServerGameEvent containing the full state.
   */
  public getFullState(): ServerGameEvent {
    return {
      type: 'fullGameState',
      senderId: 'server',
      timestamp: Date.now(),
      payload: this.serializeGameState()
    } as ServerGameEvent;
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
    const bulletsToRemove: string[] = [];
    const asteroidsToProcess: string[] = [];

    for (const [bulletId, bullet] of this.bullets) {
      for (const [asteroidId, asteroid] of this.asteroids) {
        if (this.isColliding(bullet.position, asteroid.position, this.getAsteroidRadius(asteroid.size))) {
          bulletsToRemove.push(bulletId);
          asteroidsToProcess.push(asteroidId);
          break; // Bullet can only hit one asteroid
        }
      }
    }

    for (const bulletId of bulletsToRemove) {
      this.bullets.delete(bulletId);
    }

    for (const asteroidId of asteroidsToProcess) {
      this.handleBulletAsteroidCollision(bulletsToRemove[0], asteroidId); // Assuming first bullet hit
    }

    // Check player-asteroid collisions
    for (const player of this.players.values()) {
      for (const asteroid of this.asteroids.values()) {
        if (this.isColliding(player.position, asteroid.position, this.getAsteroidRadius(asteroid.size))) {
          const isDead = player.takeDamage(20);
          this.emit('serverEvent', {
            type: 'playerHit',
            senderId: 'server',
            timestamp: Date.now(),
            payload: {
              playerId: player.id,
              damage: 20,
              newHealth: player.health
            } as PlayerHitPayload
          } as ServerGameEvent);

          if (isDead) {
            // Respawn player at random location
            player.position.x = Math.random() * this.WORLD_WIDTH;
            player.position.y = Math.random() * this.WORLD_HEIGHT;
            player.velocity.x = 0;
            player.velocity.y = 0;
            player.health = 100; // Reset health
            this.emit('serverEvent', {
              type: 'playerRespawned',
              senderId: 'server',
              timestamp: Date.now(),
              payload: { playerId: player.id, position: player.position } as PlayerRespawnedPayload
            } as ServerGameEvent);
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
      default: return 25; // Should not happen
    }
  }

  private handleBulletAsteroidCollision(bulletId: string, asteroidId: string): void {
    const bullet = this.bullets.get(bulletId);
    const asteroid = this.asteroids.get(asteroidId);
    
    if (!bullet || !asteroid) return;

    // Remove bullet (already done in checkCollisions for simplicity)
    // this.bullets.delete(bulletId);

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
      
      // Emit asteroidDestroyed event
      const newAsteroidsData: AsteroidData[] = [];
      if (asteroid.size === 'large') {
        this.createSmallerAsteroids(asteroid, 'medium', 2, newAsteroidsData);
      } else if (asteroid.size === 'medium') {
        this.createSmallerAsteroids(asteroid, 'small', 2, newAsteroidsData);
      }
      
      const scoreAwarded = asteroid.size === 'large' ? 50 : asteroid.size === 'medium' ? 30 : 20;
      if (player) {
        player.addScore(scoreAwarded);
      }

      this.emit('serverEvent', {
        type: 'asteroidDestroyed',
        senderId: 'server',
        timestamp: Date.now(),
        payload: {
          asteroidId: asteroid.id,
          newAsteroids: newAsteroidsData,
          scoreAwarded: scoreAwarded,
          playerId: player?.id // Include player ID for score update on client
        } as AsteroidDestroyedPayload
      } as ServerGameEvent);
    }
  }

  private createSmallerAsteroids(parentAsteroid: Asteroid, size: 'medium' | 'small', count: number, newAsteroidsData: AsteroidData[]): void {
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
      newAsteroidsData.push(this.serializeAsteroid(asteroid));
    }
  }

  private spawnInitialAsteroids(): void {
    for (let i = 0; i < this.INITIAL_ASTEROIDS; i++) {
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
    if (this.asteroids.size < this.MIN_ASTEROIDS) {
      this.spawnRandomAsteroid('large');
    }
  }

  private serializeGameState(): PlayerStateUpdatePayload {
    return {
      players: Array.from(this.players.values()).map(player => player.serialize()),
      bullets: Array.from(this.bullets.values()).map(bullet => this.serializeBullet(bullet)),
      asteroids: Array.from(this.asteroids.values()).map(asteroid => this.serializeAsteroid(asteroid))
    };
  }

  private serializeBullet(bullet: Bullet): BulletData {
    return {
      id: bullet.id,
      position: { ...bullet.position },
      velocity: { ...bullet.velocity },
      ownerId: bullet.ownerId,
      timeToLive: bullet.timeToLive
    };
  }

  private serializeAsteroid(asteroid: Asteroid): AsteroidData {
    return {
      id: asteroid.id,
      position: { ...asteroid.position },
      velocity: { ...asteroid.velocity },
      rotation: asteroid.rotation,
      size: asteroid.size,
      health: asteroid.health
    };
  }
}