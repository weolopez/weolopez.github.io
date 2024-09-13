export class EventHandlers {
    constructor(canvas, map, gameState, ui) {
      this.canvas = canvas;
      this.map = map;
      this.gameState = gameState;
      this.ui = ui;
      this.selectedTerritory = null;
    }
  
    init() {
      this.canvas.addEventListener('click', this.handleClick.bind(this));
      this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    }
  
    handleClick(event) {
      const { offsetX: x, offsetY: y } = event;
      const territory = this.map.getTerritoryAtPoint(x, y);
      if (territory) {
        this.handleTerritoryClick(territory);
      }
    }
  
    handleTerritoryClick(territory) {
      switch (this.gameState.phase) {
        case 'deployment':
          this.handleDeployment(territory);
          break;
        case 'attack':
          this.handleAttack(territory);
          break;
        // Add more phases as needed
      }
      this.map.render();
    }
  
    handleDeployment(territory) {
      if (territory.owner === this.gameState.currentPlayer) {
        territory.troops += 1;
      } else if (!territory.owner) {
        territory.owner = this.gameState.currentPlayer;
        territory.troops = 1;
        this.gameState.currentPlayer.addTerritory(territory);
      }
    }
  
    handleAttack(territory) {
      if (this.selectedTerritory && territory !== this.selectedTerritory) {
        // Implement attack logic
      } else {
        this.selectedTerritory = territory;
      }
    }
  
    handleMouseMove(event) {
      // Implement hover effects if desired
    }
  }