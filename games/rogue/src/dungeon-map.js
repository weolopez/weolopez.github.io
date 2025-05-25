import { generateDungeon } from './generators/mechanics.js';
import { dungeonToSVG } from './generators/visual.js';
class DungeonMap extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

  }

  static get observedAttributes() {
    return ['width', 'height', 'room-count', 'room-min-size', 'room-max-size'];
  }

  // attributeChangedCallback(name, oldValue, newValue) {
  //   if (oldValue !== newValue) {
  //     this[name.replace(/-([a-z])/g, g => g[1].toUpperCase())] = parseInt(newValue, 10);
  //     this.render();
  //   }
  // }

  connectedCallback() {
    this.cellSize = 10
    this.width = parseInt(this.getAttribute('width'), 10) || Math.floor(window.innerWidth / this.cellSize)-1;
    this.height = parseInt(this.getAttribute('height'), 10) || Math.floor(window.innerHeight / this.cellSize)-1;
    this.roomCount = parseInt(this.getAttribute('room-count'), 10) || 10;
    this.roomMinSize = parseInt(this.getAttribute('room-min-size'), 10) || 5;
    this.roomMaxSize = parseInt(this.getAttribute('room-max-size'), 10) || 10;
    this.render();
  }

  render() {

    const dungeon = generateDungeon(this.width, this.height, this.roomCount, this.roomMinSize, this.roomMaxSize);

    this.dungeon = dungeon
    const svg = dungeonToSVG(dungeon, this.cellSize, 2);
    this.svg = svg
    
    this.shadowRoot.innerHTML = `
      <style>
      :host {
        display: block;
        position: relative;
        border: 1px solid white;
      </style>
      ${svg}
    `;
  }
}

customElements.define('dungeon-map', DungeonMap);

// Include the generateDungeon and dungeonToSVG functions here
// ...

// Example usage:
// <dungeon-map width="50" height="50" room-count="10" room-min-size="5" room-max-size="10"></dungeon-map>