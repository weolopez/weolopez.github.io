// Input command types for client-server communication
export interface InputCommand {
  type: 'move' | 'rotate' | 'fire' | 'stop';
  sequenceNumber: number;
  timestamp: number;
  data?: {
    direction?: 'forward' | 'backward';
    rotation?: 'left' | 'right';
    angle?: number;
  };
}

// Game entity interfaces
export interface Vector2D {
  x: number;
  y: number;
}

export interface PlayerData {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number; // in radians
  health: number;
  score: number;
  lastInputSequence: number;
}

export interface BulletData {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  ownerId: string;
  timeToLive: number;
}

export interface AsteroidData {
  id: string;
  position: Vector2D;
  velocity: Vector2D;
  rotation: number;
  size: 'large' | 'medium' | 'small';
  health: number;
}

// Game state serialization interface
export interface GameStateData {
  players: PlayerData[];
  bullets: BulletData[];
  asteroids: AsteroidData[];
  timestamp: number;
}

// WebSocket message types
export interface GameStateMessage {
  type: 'gameState';
  data: GameStateData;
  timestamp: number;
}

export interface InputMessage {
  type: 'input';
  data: InputCommand;
}

export type WebSocketMessage = GameStateMessage | InputMessage;