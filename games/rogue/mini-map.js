import { dungeonToSVG } from './src/generators/visual.js';
class MiniMap extends HTMLElement {
  constructor() {
    super();
  }
  init(gameDiv) {
    this.gameDiv = gameDiv;

    const dungeonArray = this.gameDiv.dungeon;
    const scale = this.getAttribute('scale') || 3;
    const miniMap = dungeonToSVG(dungeonArray, scale);
    const miniMapDiv = document.createElement('div');
    miniMapDiv.innerHTML = miniMap;
    miniMapDiv.style.position = 'absolute';
    miniMapDiv.style.top = '0';
    miniMapDiv.style.right = '0';
    miniMapDiv.style.zIndex = '1000';
    miniMapDiv.style.border = '1px solid white';
    miniMapDiv.style.pointerEvents = 'none';
    this.appendChild(miniMapDiv);
  }

  connectedCallback() {
  }
}

customElements.define('mini-map', MiniMap);