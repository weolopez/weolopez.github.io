// Input command types for client-server communication (will be replaced by generic events)
// Keeping for now as reference for Asteroids game logic
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

// Game entity interfaces (can be reused or adapted for specific game logic)
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
  lastInputSequence: number; // For real-time game reconciliation
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

// Game state serialization interface (will be replaced by event-driven updates)
export interface GameStateData {
  players: PlayerData[];
  bullets: BulletData[];
  asteroids: AsteroidData[];
  timestamp: number;
}

// --- Generic Event Structure ---

/**
 * Base interface for all game-related events.
 * This structure allows for generic handling of messages across different game types.
 */
export interface GameEvent {
  /**
   * A unique identifier for the event type (e.g., 'playerMoved', 'cardDealt', 'chatMessage').
   * This is crucial for routing and processing events on both client and server.
   */
  type: string;

  /**
   * The ID of the player or entity that initiated this event.
   * For server-generated events, this might be 'server' or the ID of the player whose action caused the event.
   */
  senderId: string;

  /**
   * A server-generated timestamp (milliseconds since epoch) when the event was processed/generated on the server.
   * Useful for ordering events and for client-side interpolation/reconciliation.
   */
  timestamp: number;

  /**
   * An optional sequence number, primarily used for client-side prediction and reconciliation
   * in real-time games to track acknowledged inputs.
   */
  sequenceNumber?: number;

  /**
   * The actual game-specific data for this event.
   * This is a flexible object whose structure depends entirely on the `type` of the event.
   */
  payload: any; // Use 'any' or a more specific type if using discriminated unions
}

/**
 * Represents an event sent from a client to the server (e.g., player input).
 */
export interface ClientInputEvent extends GameEvent {
  // Client inputs might have additional client-specific metadata if needed
}

/**
 * Represents an event sent from the server to clients (e.g., game state updates, actions).
 */
export interface ServerGameEvent extends GameEvent {
  // Server events might have additional server-specific metadata if needed
}

// WebSocket message types (updated to use generic events)
export interface WebSocketMessage {
  type: 'event'; // All messages are now generic events
  event: GameEvent;
}

// Specific event payloads for Asteroids (examples)
export interface PlayerStateUpdatePayload {
  players: PlayerData[];
  bullets: BulletData[];
  asteroids: AsteroidData[];
}

export interface BulletSpawnedPayload {
  bulletId: string;
  ownerId: string;
  position: Vector2D;
  velocity: Vector2D;
}

export interface AsteroidDestroyedPayload {
  asteroidId: string;
  newAsteroids: AsteroidData[];
  scoreAwarded: number;
  playerId?: string; // Added to link score to player on client
}

export interface PlayerHitPayload {
  playerId: string;
  damage: number;
  newHealth: number;
}

export interface PlayerRespawnedPayload {
  playerId: string;
  position: Vector2D;
}

// Specific event payloads for Hold'em (examples)
export interface PlayerActionPayload {
  actionType: 'bet' | 'fold' | 'check' | 'call';
  amount?: number;
}

export interface CardsDealtPayload {
  playerId?: string; // Undefined for community cards
  hand?: string[]; // Private to player
  communityCards?: string[]; // Public
}

export interface PlayerTurnPayload {
  playerId: string;
  minBet: number;
  currentPot: number;
}

export interface RoundEndedPayload {
  winnerId: string;
  winningHand: string[];
  potWon: number;
}