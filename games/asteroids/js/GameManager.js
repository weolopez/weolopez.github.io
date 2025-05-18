// GameManager.js
// Orchestrates the overall game flow, state, and interactions between modules.

export class GameManager {
    constructor(canvas, spriteDefinitions, audioManager) {
        this.canvas = canvas;
        this.spriteDefinitions = spriteDefinitions;
        this.audioManager = audioManager;

        this.GameState = {
            SHIP_SELECTION: 'ship_selection', // This will now be the initial combined screen
            // TITLE_SCREEN: 'title_screen', // Removed
            PLAYING: 'playing',
            GAME_OVER: 'game_over',
            PAUSED: 'paused',
            PLAYER_DIED_CHOICE: 'player_died_choice'
        };
        this.currentGameState = this.GameState.SHIP_SELECTION;
        
        this.score = 0;
        this.lives = 3;
        this.currentWave = 0;
        this.selectedPlayerSpriteName = null;
        this.playerShip = null; // Reference to the player's spaceship instance

        // Module instances - these will be set by main.js after all are created
        this.entityManager = null;
        this.inputManager = null;
        this.uiManager = null;
        this.renderer = null;
        this.collisionSystem = null;
        this.zoomManager = null;
        this.starField = null; // StarField instance

        this.lastTime = performance.now();
        this.worldWidth = this.canvas.width; // Initial, will be updated by zoom
        this.worldHeight = this.canvas.height;
        this.viewChanged = true;
    }

    // Method to set module dependencies after all have been instantiated
    setModules(modules) {
        this.entityManager = modules.entityManager;
        this.inputManager = modules.inputManager;
        this.uiManager = modules.uiManager;
        this.renderer = modules.renderer;
        this.collisionSystem = modules.collisionSystem;
        this.zoomManager = modules.zoomManager;
        this.starField = modules.starField; // Assuming starField is passed in
        
        // Resolve circular dependency for CollisionSystem if it needs GameManager
        if (this.collisionSystem && !this.collisionSystem.gameManager) {
            this.collisionSystem.gameManager = this;
        }
         if (this.uiManager && !this.uiManager.gameManager) { // UIManager might need gameManager
            this.uiManager.gameManager = this;
        }
    }

    initGame() {
        this.currentGameState = this.GameState.SHIP_SELECTION;
        // UIManager will handle ship selection screen drawing and input via InputManager
        // Ensure InputManager is initialized and listening
        if (this.inputManager) {
            this.inputManager.clearCustomListeners(); // Clear previous listeners
            // this.inputManager.init(); // init() primarily sets up global keydown/keyup
            this.inputManager.on(this.inputManager.GAME_ACTIONS.ARROW_UP_PRESS, () => this.handleMenuUp());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.ARROW_DOWN_PRESS, () => this.handleMenuDown());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.MENU_CONFIRM, () => this.handleMenuConfirm());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.PAUSE, () => this.togglePause());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.RESPAWN, () => this.handleRespawnChoice());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.END_GAME_CHOICE, () => this.handleEndGameChoice());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.FIRE, () => this.handleFireAction());
            this.inputManager.on(this.inputManager.GAME_ACTIONS.SWITCH_WEAPON_1, () => this.handleSwitchWeapon(1));
            this.inputManager.on(this.inputManager.GAME_ACTIONS.SWITCH_WEAPON_2, () => this.handleSwitchWeapon(2));
        }

        // Initialize ship selection state within GameManager
        const initialSelectableShips = this.getSelectablePlayerShips();
        if (initialSelectableShips.length > 0) {
            this.currentShipSelectionIndex = 0; // Default to first ship
            this.selectedPlayerSpriteName = initialSelectableShips[0].name;
        } else {
            this.currentShipSelectionIndex = -1; // No ships available
            this.selectedPlayerSpriteName = null;
            console.error("GameManager: No selectable player ships available during initGame.");
        }

        this.loop(performance.now());
    }

    handleMenuUp() {
        if (this.currentGameState === this.GameState.SHIP_SELECTION) {
            const ships = this.getSelectablePlayerShips();
            if (ships.length === 0) return;
            this.currentShipSelectionIndex = (this.currentShipSelectionIndex - 1 + ships.length) % ships.length;
            this.selectedPlayerSpriteName = ships[this.currentShipSelectionIndex].name;
            this.audioManager.playSound('menuNavigate');
        }
    }

    handleMenuDown() {
        if (this.currentGameState === this.GameState.SHIP_SELECTION) {
            const ships = this.getSelectablePlayerShips();
            if (ships.length === 0) return;
            this.currentShipSelectionIndex = (this.currentShipSelectionIndex + 1) % ships.length;
            this.selectedPlayerSpriteName = ships[this.currentShipSelectionIndex].name;
            this.audioManager.playSound('menuNavigate');
        }
    }

    handleMenuConfirm() { // Primarily for 'Enter' key
        if (this.currentGameState === this.GameState.SHIP_SELECTION) {
            const ships = this.getSelectablePlayerShips();
            if (ships.length > 0 && this.currentShipSelectionIndex >= 0) { // Ensure valid index
                this.selectedPlayerSpriteName = ships[this.currentShipSelectionIndex].name;
                console.log(`GameManager: Player selected ship via Enter: ${this.selectedPlayerSpriteName}`);
                this.audioManager.playSound('menuConfirm');
                this.changeState(this.GameState.PLAYING); // This will trigger startGame if needed
            }
        }
        // No other states currently use MENU_CONFIRM for game progression
    }

    handleFireAction() { // Primarily for 'Spacebar'
        if (this.currentGameState === this.GameState.SHIP_SELECTION) {
            // Treat Spacebar on Ship Selection as a confirm action
            const ships = this.getSelectablePlayerShips();
            if (ships.length > 0 && this.currentShipSelectionIndex >= 0) {
                this.selectedPlayerSpriteName = ships[this.currentShipSelectionIndex].name;
                console.log(`GameManager: Player selected ship via Spacebar: ${this.selectedPlayerSpriteName}`);
                this.audioManager.playSound('menuConfirm'); // Same confirm sound
                this.changeState(this.GameState.PLAYING); // This will trigger startGame
            }
        } else if (this.currentGameState === this.GameState.PLAYING) {
            if (this.playerShip && this.playerShip.isActive) {
                const fireResult = this.playerShip.shoot(); // shoot() now returns { weaponType, projectiles }
                if (fireResult && fireResult.projectiles && fireResult.projectiles.length > 0) {
                    fireResult.projectiles.forEach(p => {
                        if (this.entityManager) {
                            this.entityManager.addEntity(p);
                        }
                    });
                    // Sounds for shooting are now primarily handled within the weapon classes or spaceship.shoot
                    // The audioManager.playSound call for specific weapon sounds can remain in the weapon classes
                    // or be triggered here based on fireResult.weaponType if preferred.
                    // For example, if weapon classes don't play their own sounds:
                    // if (fireResult.weaponType === 'laser') this.audioManager.playSound('playerShootLaserSound');
                    // else if (fireResult.weaponType === 'plasma') this.audioManager.playSound('playerShootPlasmaSound');
                }
            }
        }
    }
    
    togglePause() {
        if (this.currentGameState === this.GameState.PLAYING) {
            this.pause();
        } else if (this.currentGameState === this.GameState.PAUSED) {
            this.resume();
        }
    }

    handleRespawnChoice() {
        if (this.currentGameState === this.GameState.PLAYER_DIED_CHOICE) {
            this.respawnPlayer();
        } else if (this.currentGameState === this.GameState.GAME_OVER) { // 'R' for restart from game over
            this.changeState(this.GameState.SHIP_SELECTION);
            // No need to call initializeShipSelection here, as changeState to SHIP_SELECTION should reset relevant things
            // or initGame will be called again. For now, assume UIManager re-draws correctly.
        }
    }

    handleEndGameChoice() {
        if (this.currentGameState === this.GameState.PLAYER_DIED_CHOICE) {
            this.changeState(this.GameState.GAME_OVER);
        }
    }

    handleSwitchWeapon(weaponSlot) {
        if (this.currentGameState === this.GameState.PLAYING && this.playerShip && this.playerShip.isActive) {
            // Assuming playerShip.spriteData.weapons is an array of weapon type strings or objects
            // For simplicity, let's map slot 1 to 'laser' and slot 2 to 'plasma'
            // A more robust solution would check playerShip.spriteData.availableWeapons or similar
            let weaponTypeToEquip = null;
            if (weaponSlot === 1) {
                weaponTypeToEquip = 'laser'; // Or get from playerShip.spriteData.weapons[0].type
            } else if (weaponSlot === 2) {
                weaponTypeToEquip = 'plasma'; // Or get from playerShip.spriteData.weapons[1].type
            }

            if (weaponTypeToEquip) {
                // Check if the ship actually has this weapon type defined in its spriteData
                const shipHasWeapon = this.playerShip.spriteData.weapons &&
                                      this.playerShip.spriteData.weapons.some(w => w.type === weaponTypeToEquip);
                
                if (shipHasWeapon) {
                    this.playerShip.equipWeapon(weaponTypeToEquip);
                    this.audioManager.playSound('weaponSwitch'); // Assuming a generic weapon switch sound
                    console.log(`GameManager: Switched to weapon slot ${weaponSlot} (${weaponTypeToEquip})`);
                } else {
                    console.warn(`GameManager: Player ship does not have weapon type '${weaponTypeToEquip}' defined.`);
                }
            }
        }
    }

    startGame() {
        this.currentGameState = this.GameState.PLAYING;
        this.resetLevelAndEntities();
        this.audioManager.playMusic('background');
    }

    resetLevelAndEntities() {
        this.score = 0;
        this.lives = 3;
        this.currentWave = 0;
        this.entityManager.clearAll(); // Clear all existing entities

        if (this.selectedPlayerSpriteName) {
            this.playerShip = this.entityManager.spawnPlayer(this.selectedPlayerSpriteName);
        } else {
            // Fallback if no ship was selected (should not happen if UI enforces selection)
            const firstPlayerShipDef = this.spriteDefinitions.sprites.find(s => s.type === 'ship' && !s.ai);
            if (firstPlayerShipDef) {
                this.playerShip = this.entityManager.spawnPlayer(firstPlayerShipDef.name);
                console.warn("GameManager: No ship selected, defaulting to first available player ship.");
            } else {
                console.error("GameManager: CRITICAL - No player ship defined to start game.");
                alert("Error: No player ship available. Game cannot start.");
                this.currentGameState = this.GameState.GAME_OVER; // Or back to selection
                return;
            }
        }
        
        this.initializeWave(this.currentWave); // Spawn initial wave
        this.lastTime = performance.now();
        this.viewChanged = true;
    }

    initializeWave(waveNumber) {
        // EntityManager will handle spawning based on wave number
        // This method in GameManager might just tell EntityManager to do so.
        // For now, direct call to EntityManager's method (if it exists) or move logic here.
        // The old initializeLevel logic is largely moved to EntityManager.spawnWaveEntities
        if (this.entityManager) {
            this.entityManager.spawnWaveEntities(waveNumber, this.playerShip, this.worldWidth, this.worldHeight, this.zoomManager.getActualZoom());
        }
    }
    
    nextWave() {
        this.currentWave++;
        console.log(`Wave ${this.currentWave -1} cleared! Starting wave ${this.currentWave}.`);
        this.initializeWave(this.currentWave);
    }

    update(deltaTime) {
        if (this.currentGameState === this.GameState.PAUSED) return; // Skip updates if paused

        // Update InputManager (if it has a polling update, otherwise it's event-driven)
        // this.inputManager.update(); 

        // Update Zoom
        if (this.zoomManager) {
            const zoomChanged = this.zoomManager.update(deltaTime, this.playerShip, this.entityManager.getEntities(), this.currentGameState, this.GameState);
            if (zoomChanged) {
                this.viewChanged = true;
            }
        }
        if (this.viewChanged) {
            this.worldWidth = this.canvas.width / this.zoomManager.getActualZoom();
            this.worldHeight = this.canvas.height / this.zoomManager.getActualZoom();
            this.viewChanged = false;
        }
        
        // Update Starfield
        if (this.starField) {
            this.starField.update(deltaTime, this.zoomManager.getActualZoom());
        }

        // Handle game state specific updates
        if (this.currentGameState === this.GameState.PLAYING) {
            if (this.playerShip && this.playerShip.isActive) {
                // Handle player controls based on InputManager state
                if (this.inputManager.isActionActive(this.inputManager.GAME_ACTIONS.THRUST)) {
                    this.playerShip.isThrusting = true;
                } else {
                    this.playerShip.isThrusting = false;
                }

                if (this.inputManager.isActionActive(this.inputManager.GAME_ACTIONS.ROTATE_LEFT)) {
                    this.playerShip.rotationSpeed = -(this.playerShip.spriteData.rotationSpeed || Math.PI);
                } else if (this.inputManager.isActionActive(this.inputManager.GAME_ACTIONS.ROTATE_RIGHT)) {
                    this.playerShip.rotationSpeed = (this.playerShip.spriteData.rotationSpeed || Math.PI);
                } else {
                    this.playerShip.rotationSpeed = 0;
                }
            } else if (this.playerShip && !this.playerShip.isActive) { // Player died in this frame or previous
                this.playerLosesLife();
            }

            if (this.entityManager) this.entityManager.updateAll(deltaTime, this.zoomManager.getActualZoom());
            if (this.collisionSystem) this.collisionSystem.checkAndResolveCollisions();

            // Check for wave completion
            const activeEnemiesAndAsteroids = this.entityManager.getEntities().filter(
                obj => obj.isActive && (obj.constructor.name === 'Asteroid' || (obj.constructor.name === 'Spaceship' && obj !== this.playerShip))
            );
            if (activeEnemiesAndAsteroids.length === 0 && this.playerShip && this.playerShip.isActive) {
                this.nextWave();
            }
        } else if (this.currentGameState === this.GameState.SHIP_SELECTION) {
            // Input handling for SHIP_SELECTION is now managed by GameManager listening to InputManager events
            // (handleMenuUp, handleMenuDown, handleMenuConfirm)
            // UIManager simply draws based on GameManager's currentShipSelectionIndex.
            // No update needed here for currentShipSelectionIndex from uiManager.
        }
    }

    draw() {
        if (this.renderer) {
            this.renderer.render(this, this.entityManager, this.uiManager, this.zoomManager);
        }
    }
    
    loop(currentTime) {
        let deltaTime = (currentTime - this.lastTime) / 1000; // Changed const to let
        this.lastTime = currentTime;

        if (deltaTime > 0.1) deltaTime = 0.1; // Cap deltaTime

        if (deltaTime > 0) {
            this.update(deltaTime);
            this.draw();
        }
        requestAnimationFrame(this.loop.bind(this));
    }

    // --- State Changers & Getters ---
    changeState(newState) {
        console.log(`GameManager: Changing state from ${this.currentGameState} to ${newState}`);
        const oldState = this.currentGameState;
        this.currentGameState = newState;

        // Potentially trigger actions on state change
        if (newState === this.GameState.PLAYING) {
            if (oldState === this.GameState.SHIP_SELECTION || !this.playerShip) {
                this.startGame(); // Calls resetLevelAndEntities and starts music
            } else if (oldState === this.GameState.PAUSED) {
                this.audioManager.resumeMusic('background');
            }
            // If resuming from PLAYER_DIED_CHOICE, respawnPlayer already handled music.
        } else if (newState === this.GameState.GAME_OVER) {
            this.audioManager.stopMusic('background');
            this.audioManager.playSound('gameOver');
        } else if (newState === this.GameState.PAUSED) {
            this.audioManager.pauseMusic('background');
        }
    }
    getCurrentState() { return this.currentGameState; }
    getScore() { return this.score; }
    getLives() { return this.lives; }
    getPlayerShip() { return this.playerShip; }
    getSelectablePlayerShips() {
        // Filter out the generic "player_ship" as it's not meant to be directly selectable from the list by the user.
        // The game will use a default ship if nothing is explicitly selected, or the first from this filtered list.
        return this.spriteDefinitions.sprites.filter(s => s.type === 'ship' && !s.ai && s.name !== 'player_ship');
    }
    getCurrentShipSelectionIndex() { return this.currentShipSelectionIndex; } // Used by UIManager
    setSelectedPlayerShipName(name) { this.selectedPlayerSpriteName = name; }
    setCurrentShipSelectionIndex(index) { this.currentShipSelectionIndex = index; }


    // --- Game Actions ---
    addScore(points) { this.score += points; }
    
    playerLosesLife() {
        this.lives--;
        if (this.playerShip) this.playerShip.isActive = false; // Ensure it's marked inactive
        
        console.log(`Player lost a life. Lives remaining: ${this.lives}`);
        if (this.lives <= 0) {
            this.changeState(this.GameState.GAME_OVER);
        } else {
            this.changeState(this.GameState.PLAYER_DIED_CHOICE);
        }
    }

    respawnPlayer() {
        if (this.playerShip && this.entityManager) {
            this.entityManager.respawnPlayer(this.playerShip, this.zoomManager.getActualZoom()); // Pass current zoom
            if (this.playerShip.isActive) { // Check if respawn was successful
                 this.changeState(this.GameState.PLAYING); // Go back to playing
                 this.audioManager.resumeMusic('background');
            } else {
                console.error("GameManager: Player respawn failed, ship not active.");
                this.changeState(this.GameState.GAME_OVER); // Fallback if respawn fails
            }
        } else {
            console.error("GameManager: Cannot respawn, playerShip or entityManager missing.");
            this.changeState(this.GameState.GAME_OVER);
        }
    }

    pause() {
        if (this.currentGameState === this.GameState.PLAYING) {
            this.changeState(this.GameState.PAUSED);
        }
    }
    resume() {
        if (this.currentGameState === this.GameState.PAUSED) {
            this.changeState(this.GameState.PLAYING);
            this.lastTime = performance.now(); // Avoid large deltaTime jump
        }
    }
}