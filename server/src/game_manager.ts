import { GameRoom } from "./game_room.ts";
import { ClientInputEvent, ServerGameEvent, WebSocketMessage } from "./types.ts";
import { AsteroidsGameLogic } from "./asteroids_logic.ts"; // Will create this next
import { HoldemGameLogic } from "./holdem_logic.ts"; // Will create this later

/**
 * GameManager: Manages multiple GameRoom instances and routes WebSocket connections.
 * It acts as the central hub for all game sessions.
 */
export class GameManager {
  // Map to store active game rooms, keyed by gameType/roomId
  private gameRooms: Map<string, GameRoom>;

  constructor() {
    this.gameRooms = new Map();
  }

  /**
   * Handles a new WebSocket connection, routing it to the appropriate game room.
   * @param ws The WebSocket instance.
   * @param gameType The type of game (e.g., 'asteroids', 'holdem').
   * @param playerId The unique ID of the connecting player.
   * @param roomId Optional. The ID of the specific room to join. If not provided, a default or new room is used.
   */
  public handleWebSocketConnection(
    ws: WebSocket,
    gameType: string,
    playerId: string,
    roomId?: string,
  ): void {
    console.log(`Player ${playerId} connecting to gameType: ${gameType}, roomId: ${roomId || 'default'}`);

    // Determine the actual room ID. For simplicity, if no roomId is given,
    // we'll use a default room per game type. In a real app, you'd have a lobby system.
    const actualRoomId = roomId || `${gameType}_default_room`;
    const roomKey = `${gameType}:${actualRoomId}`;

    let gameRoom = this.gameRooms.get(roomKey);

    if (!gameRoom) {
      console.log(`Creating new GameRoom for ${roomKey}`);
      // Dynamically create the game logic based on gameType
      let gameLogic;
      switch (gameType) {
        case 'asteroids':
          gameLogic = new AsteroidsGameLogic();
          break;
        case 'holdem':
          gameLogic = new HoldemGameLogic(); // Placeholder
          break;
        default:
          console.error(`Unknown game type: ${gameType}. Closing connection for ${playerId}.`);
          ws.close(1008, `Unknown game type: ${gameType}`);
          return;
      }

      gameRoom = new GameRoom(gameType, actualRoomId, gameLogic);
      this.gameRooms.set(roomKey, gameRoom);
      
      // Start the game room's internal loop/logic if it's a real-time game
      if (gameLogic instanceof AsteroidsGameLogic) {
        gameRoom.startGameLoop();
      }
    }

    // Add the player to the game room
    gameRoom.addPlayer(playerId, ws);

    // Set up WebSocket event handlers for this player
    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        if (message.type === 'event') {
          // Ensure the senderId matches the actual player ID for security/validation
          message.event.senderId = playerId; 
          gameRoom?.handleClientEvent(message.event as ClientInputEvent);
        } else {
          console.warn(`Received unknown message type from ${playerId}: ${message.type}`);
        }
      } catch (error) {
        console.error(`Error parsing message from player ${playerId}:`, error);
      }
    };

    ws.onclose = () => {
      console.log(`Player ${playerId} disconnected from room ${roomKey}`);
      gameRoom?.removePlayer(playerId);
      // If room is empty, consider cleaning it up
      if (gameRoom?.getPlayerCount() === 0) {
        console.log(`GameRoom ${roomKey} is empty. Stopping loop and deleting room.`);
        gameRoom.stopGameLoop(); // Ensure loop is stopped
        this.gameRooms.delete(roomKey);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for player ${playerId} in room ${roomKey}:`, error);
    };
  }

  /**
   * Gets the number of active game rooms.
   */
  public getRoomCount(): number {
    return this.gameRooms.size;
  }

  /**
   * Gets the number of players across all active game rooms.
   */
  public getTotalPlayerCount(): number {
    let count = 0;
    for (const room of this.gameRooms.values()) {
      count += room.getPlayerCount();
    }
    return count;
  }
}