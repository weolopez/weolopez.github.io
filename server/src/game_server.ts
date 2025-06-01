import { GameState } from "./game_state.ts";
import { Player } from "./player.ts";
import { InputCommand } from "./types.ts";

export class GameServer {
  private gameState: GameState;
  private clients: Map<string, WebSocket>;
  private gameLoop: number | null = null;
  private readonly TICK_RATE = 60; // 60 FPS
  private readonly TICK_INTERVAL = 1000 / this.TICK_RATE;

  constructor() {
    this.gameState = new GameState();
    this.clients = new Map();
  }

  public handleWebSocketConnection(ws: WebSocket, playerId: string): void {
    console.log(`Player ${playerId} connected`);
    
    // Add client to the map
    this.clients.set(playerId, ws);
    
    // Create new player in game state
    const player = new Player(playerId, Math.random() * 800, Math.random() * 600);
    this.gameState.addPlayer(player);

    // Set up WebSocket event handlers
    ws.onmessage = (event) => {
      try {
        const inputCommand: InputCommand = JSON.parse(event.data);
        this.handlePlayerInput(playerId, inputCommand);
      } catch (error) {
        console.error(`Error parsing input from player ${playerId}:`, error);
      }
    };

    ws.onclose = () => {
      console.log(`Player ${playerId} disconnected`);
      this.clients.delete(playerId);
      this.gameState.removePlayer(playerId);
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for player ${playerId}:`, error);
    };

    // Send initial game state to the new player
    this.sendGameStateToPlayer(playerId);

    // Start game loop if this is the first player
    if (this.clients.size === 1 && !this.gameLoop) {
      this.startGameLoop();
    }
  }

  private handlePlayerInput(playerId: string, inputCommand: InputCommand): void {
    // Validate and apply input to game state
    this.gameState.processPlayerInput(playerId, inputCommand);
  }

  private startGameLoop(): void {
    console.log("Starting game loop");
    this.gameLoop = setInterval(() => {
      // Update game state
      this.gameState.update(this.TICK_INTERVAL / 1000); // Convert to seconds
      
      // Broadcast updated state to all clients
      this.broadcastGameState();
    }, this.TICK_INTERVAL);
  }

  private stopGameLoop(): void {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
      console.log("Game loop stopped");
    }
  }

  private broadcastGameState(): void {
    const gameStateData = this.gameState.serialize();
    const message = JSON.stringify({
      type: 'gameState',
      data: gameStateData,
      timestamp: Date.now()
    });

    // Send to all connected clients
    for (const [playerId, ws] of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (error) {
          console.error(`Error sending to player ${playerId}:`, error);
          // Remove disconnected client
          this.clients.delete(playerId);
          this.gameState.removePlayer(playerId);
        }
      }
    }

    // Stop game loop if no players
    if (this.clients.size === 0) {
      this.stopGameLoop();
    }
  }

  private sendGameStateToPlayer(playerId: string): void {
    const ws = this.clients.get(playerId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const gameStateData = this.gameState.serialize();
      const message = JSON.stringify({
        type: 'gameState',
        data: gameStateData,
        timestamp: Date.now()
      });
      ws.send(message);
    }
  }

  public getPlayerCount(): number {
    return this.clients.size;
  }
}