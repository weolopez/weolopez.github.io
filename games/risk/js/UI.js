export class UI {
    constructor(gameState) {
      this.gameState = gameState;
      this.endTurnButton = document.getElementById('endTurnButton');
    }
  
    setup() {
      this.endTurnButton.addEventListener('click', () => {
        this.gameState.nextPlayer();
        this.update();
      });
      this.update();
    }
  
    update() {
      // Update UI elements based on game state
      this.endTurnButton.textContent = `End Turn (${this.gameState.currentPlayer.name})`;
    }
  }