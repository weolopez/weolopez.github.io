export class UI {
  constructor(game) {
    this.game = game;
    this.endTurnButton = document.getElementById('endTurnButton');
  }

  setup() {
    this.endTurnButton.addEventListener('click', () => {
      this.game.nextTurn();
      this.update();
    });
    this.update();
  }

  update() {
    // if ()
    this.endTurnButton.textContent = `End Turn (${this.game.currentPlayer.name})`;
    // Update other UI elements as needed
  }
}