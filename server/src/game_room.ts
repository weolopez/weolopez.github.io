import { ClientInputEvent, ServerGameEvent, WebSocketMessage } from "./types.ts";
import { AsteroidsGameLogic } from "./asteroids_logic.ts"; // For type checking and instantiation

/**
 * Interface for any game logic module that a GameRoom can host.
 * This ensures a consistent API for the GameRoom to interact with different games.
 */
export interface IGameLogic {
  // Method to process client inputs
  processInput(playerId: string, event: ClientInputEvent): void;
  // Method to update the game state (for real-time games)
  update(deltaTime: number): void;
  // Method to get the initial state for a new player joining
  getInitialState(playerId: string): ServerGameEvent;
  // Method to get the current full state (for initial sync or periodic updates)
  getFullState(): ServerGameEvent;
  // Methods for event emission, matching EventEmitter's signature
  on(eventName: 'serverEvent', listener: (event: ServerGameEvent) => void): void;
  off(eventName: 'serverEvent', listener: (event: ServerGameEvent) => void): void;
}

/**
 * GameRoom: Manages players within a single game session and delegates to game-specific logic.
 * It handles WebSocket communication for its players and broadcasts events.
 */
export class GameRoom {
  public readonly gameType: string;
  public readonly roomId: string;
  private players: Map<string, WebSocket>; // Map of playerId to WebSocket
  private gameLogic: IGameLogic;
  private gameLoop: number | null = null;
  private readonly TICK_RATE = 60; // For real-time games
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;

  constructor(gameType: string, roomId: string, gameLogic: IGameLogic) {
    this.gameType = gameType;
    this.roomId = roomId;
    this.players = new Map();
    this.gameLogic = gameLogic;

    // Listen for events emitted by the game logic
    this.gameLogic.on('serverEvent', this.broadcastEvent.bind(this));
  }

  /**
   * Adds a player to this game room.
   * @param playerId The ID of the player.
   * @param ws The player's WebSocket connection.
   */
  public addPlayer(playerId: string, ws: WebSocket): void {
    this.players.set(playerId, ws);
    console.log(`Player ${playerId} joined room ${this.roomId} (${this.gameType})`);

    // Send initial game state to the newly joined player
    const initialStateEvent = this.gameLogic.getInitialState(playerId);
    console.log('Sending initial state to player:', playerId, initialStateEvent);
    this.sendEventToPlayer(playerId, initialStateEvent);
  }

  /**
   * Removes a player from this game room.
   * @param playerId The ID of the player to remove.
   */
  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
    console.log(`Player ${playerId} left room ${this.roomId} (${this.gameType})`);
    // Potentially inform game logic about player leaving
    // this.gameLogic.handlePlayerLeave(playerId);
  }

  /**
   * Handles an incoming client event, passing it to the game logic.
   * @param event The client input event.
   */
  public handleClientEvent(event: ClientInputEvent): void {
    this.gameLogic.processInput(event.senderId, event);
  }

  /**
   * Starts the game loop for real-time games.
   * This should only be called for game types that require a continuous update loop.
   */
  public startGameLoop(): void {
    if (this.gameLoop !== null) {
      console.warn(`Game loop for room ${this.roomId} already running.`);
      return;
    }
    console.log(`Starting game loop for room ${this.roomId} (${this.gameType})`);
    this.gameLoop = setInterval(() => {
      this.gameLogic.update(this.TICK_INTERVAL / 1000); // Convert to seconds
    }, this.TICK_INTERVAL);
  }

  /**
   * Stops the game loop.
   */
  public stopGameLoop(): void {
    if (this.gameLoop !== null) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
      console.log(`Stopped game loop for room ${this.roomId} (${this.gameType})`);
    }
    // Also clean up event listener from game logic
    this.gameLogic.off('serverEvent', this.broadcastEvent.bind(this));
  }

  /**
   * Broadcasts a server-generated game event to all players in this room.
   * @param event The event to broadcast.
   */
  private broadcastEvent(event: ServerGameEvent): void {
    const message: WebSocketMessage = {
      type: 'event',
      event: event
    };
    const serializedMessage = JSON.stringify(message);

    for (const [playerId, ws] of this.players) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(serializedMessage);
        } catch (error) {
          console.error(`Error sending event to player ${playerId} in room ${this.roomId}:`, error);
          // Consider removing player if send fails consistently
          // this.removePlayer(playerId);
        }
      }
    }
  }

  /**
   * Sends a specific server-generated game event to a single player in this room.
   * @param playerId The ID of the player to send the event to.
   * @param event The event to send.
   */
  private sendEventToPlayer(playerId: string, event: ServerGameEvent): void {
    const ws = this.players.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'event',
        event: event
      };
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error(`Error sending event to player ${playerId}:`, error);
      }
    }
  }

  /**
   * Gets the number of players currently in this room.
   */
  public getPlayerCount(): number {
    return this.players.size;
  }
}