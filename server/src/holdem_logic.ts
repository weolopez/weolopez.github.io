import { IGameLogic } from "./game_room.ts";
import { ClientInputEvent, ServerGameEvent } from "./types.ts";

// Custom event listener type
type GameEventListener = (event: ServerGameEvent) => void;

/**
 * HoldemGameLogic: Placeholder for Texas Hold'em game logic.
 * Implements IGameLogic for turn-based gameplay.
 */
export class HoldemGameLogic implements IGameLogic {
  // Custom event system
  private listeners: Map<'serverEvent', GameEventListener[]>;

  constructor() {
    this.listeners = new Map();
    this.listeners.set('serverEvent', []); // Initialize listener array
    console.log("HoldemGameLogic initialized (placeholder)");
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

  public processInput(playerId: string, event: ClientInputEvent): void {
    console.log(`Holdem: Player ${playerId} sent event: ${event.type}`);
    // In a real implementation, this would process poker actions (bet, fold, etc.)
    // and emit relevant ServerGameEvents.
    
    // Example: Echo back a simple event for demonstration
    this.emit('serverEvent', {
      type: 'holdemMessage',
      senderId: 'server',
      timestamp: Date.now(),
      payload: { message: `Player ${playerId} performed action: ${event.type}` }
    } as ServerGameEvent);
  }

  public update(deltaTime: number): void {
    // Turn-based games typically don't have a continuous update loop.
    // Game state changes are driven by discrete player actions.
    // This method might be empty or used for timers (e.g., turn timers).
  }

  public getInitialState(playerId: string): ServerGameEvent {
    // Send initial poker table state to new player
    return {
      type: 'initialHoldemState',
      senderId: 'server',
      timestamp: Date.now(),
      payload: {
        message: `Welcome to the Hold'em table, ${playerId}! Waiting for players...`,
        players: [], // Placeholder for actual player data
        communityCards: [],
        pot: 0,
        currentTurn: null
      }
    } as ServerGameEvent;
  }

  public getFullState(): ServerGameEvent {
    // Return current full state of the poker game
    return {
      type: 'fullHoldemState',
      senderId: 'server',
      timestamp: Date.now(),
      payload: {
        message: `Current Hold'em state.`,
        players: [], // Placeholder for actual player data
        communityCards: [],
        pot: 0,
        currentTurn: null
      }
    } as ServerGameEvent;
  }
}