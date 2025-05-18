// Import core game entities and utilities
import { Sprites } from './sprites.js';
import AudioManager from './AudioManager.js'; // Corrected: Default import
import { StarField } from './star-field.js';

// Import Manager Modules
import { GameManager } from './GameManager.js';
import { InputManager } from './InputManager.js';
import { EntityManager } from './EntityManager.js';
import { CollisionSystem } from './CollisionSystem.js';
import { Renderer } from './Renderer.js';
import { UIManager } from './UIManager.js';
import { ZoomManager } from './ZoomManager.js';

// --- Global Constants and Initial Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Ensure canvas is sized correctly (moved from old main.js)
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Inform relevant managers about resize, e.g., ZoomManager, Renderer, StarField
    if (zoomManager) zoomManager.handleResize();
    if (renderer) renderer.handleResize(); // Renderer might need to adjust viewport calcs
    if (starField) starField.handleResize(canvas.width, canvas.height); // Starfield might need to adjust
});


// --- Instantiate Core Services/Data ---
const spriteDefinitions = new Sprites();
const audioManager = new AudioManager(); // Instantiate AudioManager

// Ships image for UIManager (ship selection screen)
const shipsImage = new Image();
shipsImage.src = './ships.png'; // Ensure path is correct relative to index.html


// --- Instantiate Managers ---
// Order might matter for dependencies if not using a deferred setup method.
// For now, GameManager will receive them and can distribute or they can be passed.

const starField = new StarField(canvas, ctx); // Renderer will use this

const entityManager = new EntityManager(spriteDefinitions, canvas, ctx);
const inputManager = new InputManager(canvas); // Input manager needs canvas for potential touch
const zoomManager = new ZoomManager(canvas, { CLOSE: 0.8, MID: 0.5, FAR: 0.25 }, 0.5, 0.05);
const renderer = new Renderer(ctx, starField); // Renderer gets ctx and starfield
const uiManager = new UIManager(canvas, shipsImage, audioManager); // UIManager gets canvas, specific images, audio for UI sounds

// GameManager is the central orchestrator
const gameManager = new GameManager(canvas, spriteDefinitions, audioManager);

// CollisionSystem needs access to other managers, set after GameManager instantiation
const collisionSystem = new CollisionSystem(entityManager, gameManager, audioManager, spriteDefinitions);

// Set module dependencies in GameManager
gameManager.setModules({
    entityManager,
    inputManager,
    uiManager,
    renderer,
    collisionSystem,
    zoomManager,
    starField // Pass starField instance to GameManager if it needs to manage it directly
});


// --- Start the Game ---
// GameManager's initGame will set up initial state and start its own loop.
gameManager.initGame();

// All other game logic, global variables, and functions previously in main.js
// should now be encapsulated within the respective manager classes.
// main.js is now primarily for setup and kicking off the GameManager.