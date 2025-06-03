/**
 * Multiplayer Game Client
 * A reusable WebSocket client for real-time and turn-based multiplayer games
 * with event-driven communication.
 */
class MultiplayerClient {
  constructor(options = {}) {
    this.gameType = options.gameType;
    this.roomId = options.roomId;
    this.serverUrl = options.serverUrl || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/game/${this.gameType}${this.roomId ? '/' + this.roomId : ''}`;
    
    this.onConnectionChange = options.onConnectionChange || (() => {});
    this.onError = options.onError || console.error;
    
    // WebSocket connection
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Internal event listeners for game-specific logic
    this.eventListeners = new Map(); // Map<eventType, Set<callback>>
    
    // Client-side prediction (for real-time games)
    this.playerId = null; // Will be assigned by server
    this.localPlayerState = null; // Local predicted state for our player
    this.inputSequence = 0;
    this.inputHistory = []; // Store sent inputs for reconciliation
    this.maxInputHistory = 60; 
    
    // For real-time game interpolation (if needed by game-specific client)
    this.interpolationBuffer = [];
    this.interpolationDelay = 100; // ms, typical network latency buffer
    
    // Input handling for real-time games
    this.currentInputs = new Set(); // Active inputs (e.g., 'moveForward', 'rotateLeft')
    this.lastInputSendTime = 0;
    this.inputSendRate = 1000 / 20; // Send inputs at 20Hz
  }

  /**
   * Connects to the game server via WebSocket.
   */
  connect() {
    if (!this.gameType) {
      this.onError('Game type must be specified to connect.');
      return;
    }
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.onError('Failed to create WebSocket connection:', error);
    }
  }

  /**
   * Disconnects from the game server.
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.onConnectionChange(false);
  }

  /**
   * Sets up WebSocket event handlers (onopen, onmessage, onclose, onerror).
   */
  setupWebSocketHandlers() {
    this.ws.onopen = () => {
      console.log(`Connected to game server for ${this.gameType} room ${this.roomId || 'default'}`);
      this.connected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChange(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'event' && message.event) {
          this.handleServerEvent(message.event);
        } else {
          console.warn('Received unknown or malformed message:', message);
        }
      } catch (error) {
        this.onError('Error parsing server message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from game server');
      this.connected = false;
      this.onConnectionChange(false);
      this.attemptReconnect();
    };

    this.ws.onerror = (error) => {
      this.onError('WebSocket error:', error);
    };
  }

  /**
   * Attempts to reconnect to the server after a disconnection.
   */
  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.onError('Max reconnection attempts reached. Please refresh the page.');
    }
  }

  /**
   * Handles incoming server events and dispatches them to registered listeners.
   * @param serverEvent The ServerGameEvent received from the server.
   */
  handleServerEvent(serverEvent) {
    // If this is the first event and it contains our player ID, initialize local player
    if (!this.playerId && serverEvent.type === 'initialGameState' && serverEvent.payload.players) {
      console.log('Received initialGameState:', serverEvent); // Debug
      const targetPlayerId = serverEvent.payload.targetPlayerId;
      console.log('Target player ID:', targetPlayerId); // Debug
      const ourPlayer = serverEvent.payload.players.find(p => p.id === targetPlayerId);
      console.log('Found our player:', ourPlayer); // Debug
      if (ourPlayer) {
        this.playerId = ourPlayer.id;
        this.localPlayerState = { ...ourPlayer }; // Initialize local predicted state
        console.log(`Initialized local player with ID: ${this.playerId}`);
      } else {
        console.warn('Could not find our player in initial state');
      }
    } else if (serverEvent.type === 'playerStateUpdate' && serverEvent.payload.players && this.playerId) {
      // For real-time games, handle reconciliation for our own player
      const serverPlayer = serverEvent.payload.players.find(p => p.id === this.playerId);
      if (serverPlayer && this.localPlayerState) {
        this.reconcilePlayerState(serverPlayer);
      }
      // Store for interpolation (if game-specific client uses it)
      this.interpolationBuffer.push({
        gameState: serverEvent.payload, // Assuming payload is the full state for now
        timestamp: serverEvent.timestamp,
        receivedAt: Date.now()
      });
      if (this.interpolationBuffer.length > 10) { // Keep buffer size manageable
        this.interpolationBuffer.shift();
      }
    } else if (serverEvent.type === 'playerRespawned' && serverEvent.payload.playerId === this.playerId) {
        // If our player respawns, snap local state to new position
        if (this.localPlayerState) {
            this.localPlayerState.position = { ...serverEvent.payload.position };
            this.localPlayerState.velocity = { x: 0, y: 0 };
        }
    }

    // Dispatch the event to all registered listeners for this event type
    const listeners = this.eventListeners.get(serverEvent.type);
    if (listeners) {
      listeners.forEach(callback => callback(serverEvent));
    }
  }

  /**
   * Reconciles the local player's predicted state with the authoritative server state.
   * @param serverPlayer The authoritative player data from the server.
   */
  reconcilePlayerState(serverPlayer) {
    if (!this.localPlayerState) return;

    const positionDiff = Math.sqrt(
      Math.pow(this.localPlayerState.position.x - serverPlayer.position.x, 2) +
      Math.pow(this.localPlayerState.position.y - serverPlayer.position.y, 2)
    );

    const threshold = 5; // pixels
    
    if (positionDiff > threshold) {
      console.log('Reconciling player state - position diff:', positionDiff);
      
      // Snap to server position
      this.localPlayerState.position = { ...serverPlayer.position };
      this.localPlayerState.velocity = { ...serverPlayer.velocity };
      this.localPlayerState.rotation = serverPlayer.rotation;
      this.localPlayerState.health = serverPlayer.health;
      this.localPlayerState.score = serverPlayer.score;
      
      // Replay unacknowledged inputs
      // Filter inputs that were sent *after* the server's last acknowledged input
      const unacknowledgedInputs = this.inputHistory.filter(
        input => input.sequenceNumber > serverPlayer.lastInputSequence
      );
      
      for (const input of unacknowledgedInputs) {
        // Re-apply the input to the corrected local state
        this.applyInputLocally(input, 1/60); // Assume 60 FPS for replay
      }
    }
    // Update health and score directly from server as they are authoritative
    this.localPlayerState.health = serverPlayer.health;
    this.localPlayerState.score = serverPlayer.score;
  }

  /**
   * Registers a callback function for a specific server event type.
   * @param eventType The type of event to listen for (e.g., 'playerStateUpdate', 'cardDealt').
   * @param callback The function to call when the event occurs.
   */
  on(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);
  }

  /**
   * Removes a registered callback function for a specific server event type.
   * @param eventType The type of event.
   * @param callback The function to remove.
   */
  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }
  }

  /**
   * Sends a client input event to the server.
   * @param eventType The type of client event (e.g., 'playerInput', 'playerAction').
   * @param payload The event-specific data.
   */
  sendEvent(eventType, payload = {}) {
    if (!this.connected || !this.playerId) {
      console.warn('Not connected or player ID not assigned. Cannot send event.');
      return;
    }

    const clientEvent = {
      type: eventType,
      senderId: this.playerId,
      timestamp: Date.now(),
      sequenceNumber: ++this.inputSequence, // Increment for each sent input
      payload: payload
    };

    this.sendMessage({
      type: 'event',
      event: clientEvent
    });

    // For real-time games, apply input locally for prediction and store for reconciliation
    if (this.gameType === 'asteroids' && eventType === 'playerInput') {
      this.applyInputLocally(clientEvent, 1/60); // Apply immediately for prediction
      this.inputHistory.push(clientEvent);
      if (this.inputHistory.length > this.maxInputHistory) {
        this.inputHistory.shift();
      }
    }
  }

  /**
   * Sends a raw WebSocket message.
   * @param message The message object to send.
   */
  sendMessage(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Updates the client-side prediction for the local player (for real-time games).
   * This should be called in the client's main game loop.
   * @param deltaTime The time elapsed since the last update in seconds.
   */
  update(deltaTime) {
    const now = Date.now();
    
    // Send inputs at controlled rate for real-time games
    if (this.gameType === 'asteroids' && now - this.lastInputSendTime >= this.inputSendRate) {
      this.sendQueuedInputs();
      this.lastInputSendTime = now;
    }
    
    // Update local player prediction for real-time games
    if (this.gameType === 'asteroids' && this.localPlayerState) {
      this.updateLocalPlayerPrediction(deltaTime);
    }
  }

  /**
   * Sends all currently active inputs as a single 'playerInput' event.
   * This is for real-time games where multiple keys might be pressed simultaneously.
   */
  sendQueuedInputs() {
    if (!this.connected || this.currentInputs.size === 0) return;

    const inputPayload = {};
    let hasMovement = false;
    let hasRotation = false;

    this.currentInputs.forEach(input => {
      if (input.type === 'move') {
        inputPayload.direction = input.data.direction;
        hasMovement = true;
      } else if (input.type === 'rotate') {
        inputPayload.rotation = input.data.rotation;
        hasRotation = true;
      } else if (input.type === 'fire') {
        // Fire is a discrete action, send immediately
        this.sendEvent('playerInput', { inputType: 'fire' });
        this.currentInputs.delete(input); // Remove fire input after sending
      }
    });

    // Only send if there's actual movement or rotation
    if (hasMovement || hasRotation) {
      this.sendEvent('playerInput', { inputType: 'continuous', ...inputPayload });
    }
  }

  /**
   * Adds an input to the queue for continuous sending (for real-time games).
   * @param inputType The type of input (e.g., 'move', 'rotate', 'fire').
   * @param data Additional data for the input (e.g., { direction: 'forward' }).
   */
  addInput(inputType, data = {}) {
    // For discrete actions like 'fire', send immediately
    if (inputType === 'fire') {
      this.sendEvent('playerInput', { inputType: 'fire' });
      return;
    }
    // For continuous actions, add to currentInputs set
    this.currentInputs.add({ type: inputType, data });
  }

  /**
   * Removes an input from the queue (for real-time games).
   * @param inputType The type of input to remove.
   */
  removeInput(inputType) {
    this.currentInputs.forEach(input => {
      if (input.type === inputType) {
        this.currentInputs.delete(input);
      }
    });
  }

  /**
   * Applies an input command to the local player's predicted state.
   * This logic must match the server's player physics.
   * @param inputCommand The input command to apply.
   * @param deltaTime The time elapsed in seconds for the simulation step.
   */
  applyInputLocally(inputCommand, deltaTime) {
    if (!this.localPlayerState) return;
    
    // Apply the same logic as the server for prediction
    switch (inputCommand.payload.inputType) {
      case 'continuous':
        if (inputCommand.payload.direction) {
          this.applyMovement(inputCommand.payload.direction, deltaTime);
        }
        if (inputCommand.payload.rotation) {
          this.applyRotation(inputCommand.payload.rotation, deltaTime);
        }
        break;
      case 'fire':
        // Client-side visual effect for firing, actual bullet handled by server
        break;
      // No 'stop' input type in new event model, continuous inputs stop when keys are released
    }
  }

  applyMovement(direction, deltaTime) {
    const thrust = 500 * deltaTime; // Match server acceleration
    const dir = direction === 'forward' ? 1 : -1;
    
    const thrustX = Math.cos(this.localPlayerState.rotation) * thrust * dir;
    const thrustY = Math.sin(this.localPlayerState.rotation) * thrust * dir;
    
    this.localPlayerState.velocity.x += thrustX;
    this.localPlayerState.velocity.y += thrustY;
    
    // Limit speed (match server)
    const maxSpeed = 300;
    const speed = Math.sqrt(this.localPlayerState.velocity.x ** 2 + this.localPlayerState.velocity.y ** 2);
    if (speed > maxSpeed) {
      this.localPlayerState.velocity.x = (this.localPlayerState.velocity.x / speed) * maxSpeed;
      this.localPlayerState.velocity.y = (this.localPlayerState.velocity.y / speed) * maxSpeed;
    }
  }

  applyRotation(rotation, deltaTime) {
    const rotationSpeed = 4; // Match server rotation speed
    const rotationDelta = rotationSpeed * deltaTime;
    
    if (rotation === 'left') {
      this.localPlayerState.rotation -= rotationDelta;
    } else if (rotation === 'right') {
      this.localPlayerState.rotation += rotationDelta;
    }
    
    // Normalize rotation
    this.localPlayerState.rotation = ((this.localPlayerState.rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  }

  /**
   * Updates the local player's predicted position based on its velocity.
   * This logic must match the server's player physics.
   * @param deltaTime The time elapsed in seconds for the simulation step.
   */
  updateLocalPlayerPrediction(deltaTime) {
    if (!this.localPlayerState) return;

    // Apply friction (match server)
    this.localPlayerState.velocity.x *= 0.98;
    this.localPlayerState.velocity.y *= 0.98;
    
    // Update position
    this.localPlayerState.position.x += this.localPlayerState.velocity.x * deltaTime;
    this.localPlayerState.position.y += this.localPlayerState.velocity.y * deltaTime;
    
    // Wrap around screen edges (match server)
    const worldWidth = 800;
    const worldHeight = 600;
    this.localPlayerState.position.x = ((this.localPlayerState.position.x % worldWidth) + worldWidth) % worldWidth;
    this.localPlayerState.position.y = ((this.localPlayerState.position.y % worldHeight) + worldHeight) % worldHeight;
  }

  /**
   * Gets the interpolated game state for rendering.
   * This is primarily for real-time games to smooth out other players' movements.
   * @returns The interpolated game state.
   */
  getInterpolatedGameState() {
    const now = Date.now();
    const renderTime = now - this.interpolationDelay;
    
    // Find the two states to interpolate between
    let from = null;
    let to = null;
    
    for (let i = 0; i < this.interpolationBuffer.length - 1; i++) {
      if (this.interpolationBuffer[i].receivedAt <= renderTime &&
          this.interpolationBuffer[i + 1].receivedAt >= renderTime) {
        from = this.interpolationBuffer[i];
        to = this.interpolationBuffer[i + 1];
        break;
      }
    }
    
    if (!from || !to) {
      // If buffer is empty or not enough data, use the most recent state
      return this.interpolationBuffer.length > 0 ? this.interpolationBuffer[this.interpolationBuffer.length - 1].gameState : null;
    }
    
    // Calculate interpolation factor
    const totalTime = to.receivedAt - from.receivedAt;
    const elapsedTime = renderTime - from.receivedAt;
    const t = totalTime > 0 ? elapsedTime / totalTime : 0;
    
    // Interpolate positions for all entities except local player
    const interpolatedState = {
      players: from.gameState.players.map((fromPlayer) => {
        if (fromPlayer.id === this.playerId) {
          // Use local prediction for our own player
          return this.localPlayerState || fromPlayer;
        }
        
        const toPlayer = to.gameState.players.find(p => p.id === fromPlayer.id);
        if (!toPlayer) return fromPlayer; // Player might have disconnected
        
        return {
          ...fromPlayer,
          position: {
            x: this.lerp(fromPlayer.position.x, toPlayer.position.x, t),
            y: this.lerp(fromPlayer.position.y, toPlayer.position.y, t)
          },
          rotation: this.lerpAngle(fromPlayer.rotation, toPlayer.rotation, t)
        };
      }),
      bullets: to.gameState.bullets, // Bullets move too fast to interpolate meaningfully
      asteroids: from.gameState.asteroids.map((fromAsteroid) => {
        const toAsteroid = to.gameState.asteroids.find(a => a.id === fromAsteroid.id);
        if (!toAsteroid) return fromAsteroid; // Asteroid might have been destroyed
        
        return {
          ...fromAsteroid,
          position: {
            x: this.lerp(fromAsteroid.position.x, toAsteroid.position.x, t),
            y: this.lerp(fromAsteroid.position.y, toAsteroid.position.y, t)
          },
          rotation: this.lerpAngle(fromAsteroid.rotation, toAsteroid.rotation, t)
        };
      }),
      timestamp: to.gameState.timestamp
    };
    
    return interpolatedState;
  }

  lerp(a, b, t) {
    return a + (b - a) * Math.max(0, Math.min(1, t));
  }

  lerpAngle(a, b, t) {
    // Handle angle wrapping for smooth rotation interpolation
    let diff = b - a;
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;
    return a + diff * Math.max(0, Math.min(1, t));
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiplayerClient;
} else if (typeof window !== 'undefined') {
  window.MultiplayerClient = MultiplayerClient;
}