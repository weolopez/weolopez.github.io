import { PlayerBase } from '../../common/js/player_base.js';

export class HoldemPlayer extends PlayerBase {
    /**
     * Creates a new Hold'em player.
     * @param {number|string} id - The unique identifier for the player.
     * @param {string} name - The name of the player.
     * @param {number} initialChips - The starting amount of chips for the player.
     * @param {boolean} [isHuman=false] - Whether the player is human-controlled.
     * @param {object} uiElements - DOM elements associated with this player's UI.
     * @param {number} originalId - The original stable ID for AI targeting or UI mapping.
     */
    constructor(id, name, initialChips, isHuman = false, uiElements, originalId) {
        super(id, name, initialChips, isHuman);
        this.originalId = originalId; // Store original ID for AI behavior or stable UI mapping
        this.currentBet = 0;
        this.totalBetInPotThisHand = 0; // Tracks total contribution to the pot for this hand (for side pots)
        this.hasActedThisRound = false;
        // isAllIn is inherited from PlayerBase
        // folded is inherited from PlayerBase
        // lastAction is inherited from PlayerBase
        this.lastRaiseAmount = 0; // Tracks the size of the last raise this player made or faced
        this.showCardsAfterFold = false; // For showdown scenarios where a folded player's cards might be shown

        this.ui = uiElements || { // Store references to DOM elements for this player
            cardsDiv: document.getElementById(`player${originalId}-cards`),
            chipsDiv: document.getElementById(`player${originalId}-chips`),
            betDiv: document.getElementById(`player${originalId}-bet`),
            statusDiv: document.getElementById(`player${originalId}-status`),
            areaDiv: document.getElementById(`player${originalId}-area`)
        };
        this.bestHandDetails = null; // To store evaluated hand at showdown
    }

    /**
     * Resets player state for a new hand in Hold'em.
     * @param {number} [startingChips] - Optional new starting chips amount.
     */
    resetForNewHand(startingChips) {
        super.resetForNewHand(startingChips); // Calls PlayerBase reset
        this.currentBet = 0;
        this.totalBetInPotThisHand = 0;
        this.hasActedThisRound = false;
        this.lastRaiseAmount = 0;
        this.showCardsAfterFold = false;
        this.bestHandDetails = null;
        // Re-evaluate all-in status based on chips, important if chips were just awarded/deducted
        this.isAllIn = this.chips === 0;
    }

    /**
     * Places a bet or adds to the current bet for the player.
     * @param {number} amount - The amount to bet.
     * @returns {number} The actual amount bet (can be less if player is all-in).
     */
    placeBet(amount) {
        const betAmount = Math.min(amount, this.chips);
        this.updateChips(-betAmount); // Subtract from player's chips
        this.currentBet += betAmount;
        this.totalBetInPotThisHand += betAmount;
        if (this.chips === 0) {
            this.isAllIn = true;
        }
        return betAmount;
    }
}