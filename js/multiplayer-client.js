/**
 * Multiplayer Game Client
 * A reusable WebSocket client for real-time multiplayer games with client-side prediction and reconciliation
 */
class MultiplayerClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/game`;
    this.onGameStateUpdate = options.onGameStateUpdate || (() => {});
    this.onConnectionChange = options.onConnectionChange || (() => {});
    this.onError = options.onError || console.error;
    
    // WebSocket connection
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    
    // Client-side prediction
    this.localPlayer = null;
    this.inputSequence = 0;
    this.inputHistory = [];
    this.maxInputHistory = 60; // Keep last 60 inputs for reconciliation
    
    // Game state
    this.gameState = {
      players: [],
      bullets: [],
      asteroids: [],
      timestamp: 0
    };
    
    // Interpolation for smooth movement
    this.interpolationBuffer = [];
    this.interpolationDelay = 100; // ms
    
    // Input handling
    this.currentInputs = new Set();
    this.lastInputTime = 0;
    this.inputRate = 1000 / 20; // Send inputs at 20Hz
  }

  connect() {
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupWebSocketHandlers();
    } catch (error) {
      this.onError('Failed to create WebSocket connection:', error);
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.onConnectionChange(false);
  }

  setupWebSocketHandlers() {
    this.ws.onopen = () => {
      console.log('Connected to game server');
      this.connected = true;
      this.reconnectAttempts = 0;
      this.onConnectionChange(true);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleServerMessage(message);
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

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      this.onError('Max reconnection attempts reached');
    }
  }

  handleServerMessage(message) {
    if (message.type === 'gameState') {
      this.handleGameStateUpdate(message.data, message.timestamp);
    }
  }

  handleGameStateUpdate(serverGameState, serverTimestamp) {
    // Store for interpolation
    this.interpolationBuffer.push({
      gameState: serverGameState,
      timestamp: serverTimestamp,
      receivedAt: Date.now()
    });

    // Keep buffer size manageable
    if (this.interpolationBuffer.length > 10) {
      this.interpolationBuffer.shift();
    }

    // Find our player in the server state
    const serverPlayer = serverGameState.players.find(p => p.id === this.playerId);
    
    if (serverPlayer && this.localPlayer) {
      this.reconcilePlayerState(serverPlayer);
    }

    // Update game state (this will be interpolated)
    this.gameState = serverGameState;
    this.onGameStateUpdate(this.getInterpolatedGameState());
  }

  reconcilePlayerState(serverPlayer) {
    // Check if server state differs significantly from our prediction
    const positionDiff = Math.sqrt(
      Math.pow(this.localPlayer.position.x - serverPlayer.position.x, 2) +
      Math.pow(this.localPlayer.position.y - serverPlayer.position.y, 2)
    );

    const threshold = 5; // pixels
    
    if (positionDiff > threshold) {
      console.log('Reconciling player state - position diff:', positionDiff);
      
      // Snap to server position
      this.localPlayer.position = { ...serverPlayer.position };
      this.localPlayer.velocity = { ...serverPlayer.velocity };
      this.localPlayer.rotation = serverPlayer.rotation;
      
      // Replay unacknowledged inputs
      const unacknowledgedInputs = this.inputHistory.filter(
        input => input.sequenceNumber > serverPlayer.lastInputSequence
      );
      
      for (const input of unacknowledgedInputs) {
        this.applyInputLocally(input, 1/60); // Assume 60 FPS for replay
      }
    }
  }

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
      // Use the most recent state if we can't interpolate
      return this.gameState;
    }
    
    // Calculate interpolation factor
    const totalTime = to.receivedAt - from.receivedAt;
    const elapsedTime = renderTime - from.receivedAt;
    const t = totalTime > 0 ? elapsedTime / totalTime : 0;
    
    // Interpolate positions for all entities except local player
    const interpolatedState = {
      players: from.gameState.players.map((fromPlayer, index) => {
        if (fromPlayer.id === this.playerId) {
          // Use local prediction for our own player
          return this.localPlayer || fromPlayer;
        }
        
        const toPlayer = to.gameState.players[index];
        if (!toPlayer) return fromPlayer;
        
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
      asteroids: from.gameState.asteroids.map((fromAsteroid, index) => {
        const toAsteroid = to.gameState.asteroids[index];
        if (!toAsteroid) return fromAsteroid;
        
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

  // Input handling methods
  addInput(inputType, data = {}) {
    this.currentInputs.add({ type: inputType, data });
  }

  removeInput(inputType) {
    this.currentInputs.forEach(input => {
      if (input.type === inputType) {
        this.currentInputs.delete(input);
      }
    });
  }

  update(deltaTime) {
    const now = Date.now();
    
    // Send inputs at controlled rate
    if (now - this.lastInputTime >= this.inputRate) {
      this.sendInputs();
      this.lastInputTime = now;
    }
    
    // Update local player prediction
    if (this.localPlayer) {
      this.updateLocalPlayer(deltaTime);
    }
  }

  sendInputs() {
    if (!this.connected || this.currentInputs.size === 0) return;
    
    for (const input of this.currentInputs) {
      const inputCommand = {
        type: input.type,
        sequenceNumber: ++this.inputSequence,
        timestamp: Date.now(),
        data: input.data
      };
      
      // Send to server
      this.sendMessage({
        type: 'input',
        data: inputCommand
      });
      
      // Apply locally for prediction
      this.applyInputLocally(inputCommand, 1/60);
      
      // Store for reconciliation
      this.inputHistory.push(inputCommand);
      
      // Limit history size
      if (this.inputHistory.length > this.maxInputHistory) {
        this.inputHistory.shift();
      }
    }
  }

  applyInputLocally(inputCommand, deltaTime) {
    if (!this.localPlayer) return;
    
    // Apply the same logic as the server for prediction
    switch (inputCommand.type) {
      case 'move':
        this.applyMovement(inputCommand, deltaTime);
        break;
      case 'rotate':
        this.applyRotation(inputCommand, deltaTime);
        break;
      case 'stop':
        this.localPlayer.velocity = { x: 0, y: 0 };
        break;
    }
  }

  applyMovement(inputCommand, deltaTime) {
    const thrust = 500 * deltaTime; // Match server acceleration
    const direction = inputCommand.data.direction === 'forward' ? 1 : -1;
    
    const thrustX = Math.cos(this.localPlayer.rotation) * thrust * direction;
    const thrustY = Math.sin(this.localPlayer.rotation) * thrust * direction;
    
    this.localPlayer.velocity.x += thrustX;
    this.localPlayer.velocity.y += thrustY;
    
    // Limit speed (match server)
    const maxSpeed = 300;
    const speed = Math.sqrt(this.localPlayer.velocity.x ** 2 + this.localPlayer.velocity.y ** 2);
    if (speed > maxSpeed) {
      this.localPlayer.velocity.x = (this.localPlayer.velocity.x / speed) * maxSpeed;
      this.localPlayer.velocity.y = (this.localPlayer.velocity.y / speed) * maxSpeed;
    }
  }

  applyRotation(inputCommand, deltaTime) {
    const rotationSpeed = 4; // Match server rotation speed
    const rotationDelta = rotationSpeed * deltaTime;
    
    if (inputCommand.data.rotation === 'left') {
      this.localPlayer.rotation -= rotationDelta;
    } else if (inputCommand.data.rotation === 'right') {
      this.localPlayer.rotation += rotationDelta;
    }
    
    // Normalize rotation
    this.localPlayer.rotation = ((this.localPlayer.rotation % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
  }

  updateLocalPlayer(deltaTime) {
    // Apply friction (match server)
    this.localPlayer.velocity.x *= 0.98;
    this.localPlayer.velocity.y *= 0.98;
    
    // Update position
    this.localPlayer.position.x += this.localPlayer.velocity.x * deltaTime;
    this.localPlayer.position.y += this.localPlayer.velocity.y * deltaTime;
    
    // Wrap around screen edges (match server)
    const worldWidth = 800;
    const worldHeight = 600;
    this.localPlayer.position.x = ((this.localPlayer.position.x % worldWidth) + worldWidth) % worldWidth;
    this.localPlayer.position.y = ((this.localPlayer.position.y % worldHeight) + worldHeight) % worldHeight;
  }

  sendMessage(message) {
    if (this.connected && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  // Initialize local player when we receive our player ID from server
  initializeLocalPlayer(playerData) {
    this.playerId = playerData.id;
    this.localPlayer = {
      id: playerData.id,
      position: { ...playerData.position },
      velocity: { ...playerData.velocity },
      rotation: playerData.rotation,
      health: playerData.health,
      score: playerData.score
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MultiplayerClient;
} else if (typeof window !== 'undefined') {
  window.MultiplayerClient = MultiplayerClient;
}