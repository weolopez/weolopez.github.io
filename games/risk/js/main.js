// In main.js

import { Game } from './core/Game.js';
import { Map } from './map/Map.js';
import { UI } from './components/UI.js';
import { EventHandlers } from './components/EventHandlers.js';

(async function init() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Initialize Game Logic
  const game = new Game();

  // Load and Render Map
  const map = new Map(ctx);
  await map.load('./js/decatur-war.json'); // Update the path to your GeoJSON file
  map.render();

  // Initialize UI
  const ui = new UI(game);
  ui.setup();

  // Set up Event Handlers
  const eventHandlers = new EventHandlers(canvas, map, game, ui);
  eventHandlers.init();

  // Start Game
  game.start();
})();
