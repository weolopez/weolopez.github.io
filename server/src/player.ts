import { Vector2D, PlayerData, InputCommand } from "./types.ts";

export class Player {
  public id: string;
  public position: Vector2D;
  public velocity: Vector2D;
  public rotation: number; // in radians
  public health: number;
  public score: number;
  public lastInputSequence: number;
  
  // Game constants
  private readonly MAX_SPEED = 300; // pixels per second
  private readonly ACCELERATION = 500; // pixels per second squared
  private readonly ROTATION_SPEED = 4; // radians per second
  private readonly FRICTION = 0.98; // velocity decay factor
  private readonly MAX_HEALTH = 100;

  constructor(id: string, x: number = 0, y: number = 0) {
    this.id = id;
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.health = this.MAX_HEALTH;
    this.score = 0;
    this.lastInputSequence = 0;
  }

  public processInput(input: InputCommand, deltaTime: number): void {
    // Only process if this input is newer than the last processed one
    if (input.sequenceNumber <= this.lastInputSequence) {
      return;
    }
    
    this.lastInputSequence = input.sequenceNumber;

    switch (input.type) {
      case 'move':
        this.handleMovement(input, deltaTime);
        break;
      case 'rotate':
        this.handleRotation(input, deltaTime);
        break;
      case 'fire':
        // Fire handling will be done by GameState
        break;
      case 'stop':
        // Stop all movement
        this.velocity.x = 0;
        this.velocity.y = 0;
        break;
    }
  }

  private handleMovement(input: InputCommand, deltaTime: number): void {
    if (!input.data?.direction) return;

    const thrust = this.ACCELERATION * deltaTime;
    const direction = input.data.direction === 'forward' ? 1 : -1;

    // Calculate thrust vector based on current rotation
    const thrustX = Math.cos(this.rotation) * thrust * direction;
    const thrustY = Math.sin(this.rotation) * thrust * direction;

    // Apply thrust to velocity
    this.velocity.x += thrustX;
    this.velocity.y += thrustY;

    // Limit maximum speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (speed > this.MAX_SPEED) {
      this.velocity.x = (this.velocity.x / speed) * this.MAX_SPEED;
      this.velocity.y = (this.velocity.y / speed) * this.MAX_SPEED;
    }
  }

  private handleRotation(input: InputCommand, deltaTime: number): void {
    if (!input.data?.rotation) return;

    const rotationDelta = this.ROTATION_SPEED * deltaTime;
    
    if (input.data.rotation === 'left') {
      this.rotation -= rotationDelta;
    } else if (input.data.rotation === 'right') {
      this.rotation += rotationDelta;
    }

    // Normalize rotation to 0-2π range
    this.rotation = ((this.rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  }

  public update(deltaTime: number, worldWidth: number = 800, worldHeight: number = 600): void {
    // Apply friction
    this.velocity.x *= this.FRICTION;
    this.velocity.y *= this.FRICTION;

    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;

    // Wrap around screen edges (classic Asteroids behavior)
    this.position.x = ((this.position.x % worldWidth) + worldWidth) % worldWidth;
    this.position.y = ((this.position.y % worldHeight) + worldHeight) % worldHeight;
  }

  public takeDamage(damage: number): boolean {
    this.health -= damage;
    return this.health <= 0;
  }

  public addScore(points: number): void {
    this.score += points;
  }

  public serialize(): PlayerData {
    return {
      id: this.id,
      position: { ...this.position },
      velocity: { ...this.velocity },
      rotation: this.rotation,
      health: this.health,
      score: this.score,
      lastInputSequence: this.lastInputSequence
    };
  }

  public static fromData(data: PlayerData): Player {
    const player = new Player(data.id, data.position.x, data.position.y);
    player.velocity = { ...data.velocity };
    player.rotation = data.rotation;
    player.health = data.health;
    player.score = data.score;
    player.lastInputSequence = data.lastInputSequence;
    return player;
  }
}