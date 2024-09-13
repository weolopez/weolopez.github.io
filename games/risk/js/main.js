import { Map } from './Map.js';
import { GameState } from './GameState.js';
import { UI } from './UI.js';
import { EventHandlers } from './EventHandlers.js';

(async function init() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Initialize Game State
  const gameState = new GameState();

  // Load Map
  const map = new Map(ctx, gameState);
  await map.loadGeoJSON('js/decatur-war.json');
  map.render();

  // Initialize UI
  const ui = new UI(gameState);
  ui.setup();

  // Set up Event Handlers
  const eventHandlers = new EventHandlers(canvas, map, gameState, ui);
  eventHandlers.init();

  // Start Game Loop or Logic
})();